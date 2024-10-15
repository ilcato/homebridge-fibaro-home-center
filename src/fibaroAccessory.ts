// fibaroAccessory.ts

import {
  PlatformAccessory,
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  CharacteristicGetCallback,
  CharacteristicValue,
} from 'homebridge';
import { FibaroHC } from './platform';
import * as constants from './constants';
import { manualDeviceConfigs } from './deviceManual';
import { autoDeviceConfigs } from './deviceAuto';

export class FibaroAccessory {
  isValid;
  lastServiceChecked;

  constructor(
    private readonly platform: FibaroHC,
    private readonly accessory: PlatformAccessory,
    private readonly device,
  ) {
    this.isValid = true;
    // set accessory information
    const properties = this.device.properties || {};
    const manufacturer = (properties.zwaveCompany || 'IlCato').replace('Fibargroup', 'Fibar Group');

    const roomName = this.platform.getRoomNameById(this.device.roomID);

    // Set accessory information
    const serialNumber = properties.serialNumber?.startsWith('h\'') ? properties.serialNumber.slice(2) : properties.serialNumber;
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, manufacturer)
      .setCharacteristic(this.platform.Characteristic.Model, `${this.device.type.length > 1 ?
        this.device.type :
        'HomeCenter Bridged Accessory'}`)
      .setCharacteristic(this.platform.Characteristic.SerialNumber,
        `ID: ${this.device.id}` +
        `${roomName ? `, Room: ${roomName}` : ''}` +
        `${serialNumber ? `, ${serialNumber}` : ''}`,
      );

    // Check for device-specific configuration
    const devConfig = this.platform.config.devices?.find(item => item.id === this.device.id);

    // Configure accessory based on config or device type
    let serviceAndCharacteristics;
    if (devConfig) {
      serviceAndCharacteristics = this.configureAccessoryFromConfig(devConfig);
    } else {
      serviceAndCharacteristics = this.configureAccessoryFromType();
    }
    if (!serviceAndCharacteristics || !(serviceAndCharacteristics instanceof Array) || serviceAndCharacteristics.length === 0) {
      this.isValid = false;
      return;
    }

    // Add battery service if the device supports it
    if (this.device.interfaces && this.device.interfaces.includes('battery')) {
      serviceAndCharacteristics.push({
        service: this.platform.Service.Battery,
        characteristics: [this.platform.Characteristic.BatteryLevel,
          this.platform.Characteristic.ChargingState,
          this.platform.Characteristic.StatusLowBattery],
        subtype: this.device.id + '----',
      });
    }

    // loop through all services, create it if necessary and bind characteristics
    serviceAndCharacteristics.forEach(({ service, characteristics, subtype }) => {
      const serviceName = this.buildServiceName(service, subtype);
      let s = this.accessory.getService(serviceName);
      if (!s) {
        s = this.accessory.addService(service, serviceName, subtype);
      }
      this.bindCharacterstics(s, characteristics);
    });

    // Remove no more existing services
    for (let t = 0; t < this.accessory.services.length; t++) {
      const s = this.accessory.services[t];
      if (s.constructor === this.platform.Service.AccessoryInformation) {
        continue;
      }
      if (!serviceAndCharacteristics.some(sc => sc.service === s.constructor)) {
        this.accessory.removeService(s);
      }
    }
  }

  buildServiceName(service, subtype) {
    if (service === this.platform.Service.Battery) {
      return this.device.name + ' Battery';
    } else if (service === this.platform.Service.StatelessProgrammableSwitch) {
      return this.device.name + ' Button ' + subtype.split('-')[4];
    } else {
      return this.device.name;
    }
  }

  bindCharacterstics(service, characteristics) {
    if (!characteristics) {
      return;
    }
    const IDs = service.subtype.split('-');
    this.setServiceProperties(service, IDs);

    for (let i = 0; i < characteristics.length; i++) {
      const characteristic = service.getCharacteristic(characteristics[i]);

      // Set the range for light level measurements
      if (characteristic.constructor === this.platform.Characteristic.CurrentAmbientLightLevel) {
        characteristic.props.maxValue = 100000;
        characteristic.props.minStep = 1;
        characteristic.props.minValue = 0;
      }

      // Set the minimum temperature that can be reported
      if (characteristic.constructor === this.platform.Characteristic.CurrentTemperature) {
        characteristic.props.minValue = -50;
      }

      // Set the maximum target temperature based on configuration
      if (characteristic.constructor === this.platform.Characteristic.TargetTemperature) {
        characteristic.props.maxValue = this.platform.config.thermostatmaxtemperature;
      }

      // Set the default valve type to generic
      if (characteristic.constructor === this.platform.Characteristic.ValveType) {
        characteristic.value = this.platform.Characteristic.ValveType.GENERIC_VALVE;
      }

      // Set the initial air quality status to unknown
      if (characteristic.constructor === this.platform.Characteristic.AirQuality) {
        characteristic.value = this.platform.Characteristic.AirQuality.UNKNOWN;
      }

      // Set the remote controller scene activationbutton options
      if (service.isRemoteControllerSceneActivation &&
        characteristic.constructor === this.platform.Characteristic.ProgrammableSwitchEvent) {
        characteristic.props.validValues = [this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
          this.platform.Characteristic.ProgrammableSwitchEvent.LONG_PRESS];
      }

      // Set the remote controller central scene button options
      if (service.isRemoteControllerCentralScene &&
        characteristic.constructor === this.platform.Characteristic.ProgrammableSwitchEvent) {
        characteristic.props.validValues = [this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
          this.platform.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS,
          this.platform.Characteristic.ProgrammableSwitchEvent.LONG_PRESS];
      }

      // Bind the characteristic to the service
      this.bindCharacteristic(characteristic, service, IDs);
    }
  }

  bindCharacteristic(characteristic, service, IDs) {
    if (!characteristic || !service || !service.subtype) {
      return;
    }

    if (this.shouldSubscribeToUpdates(service, characteristic)) {
      this.subscribeUpdate(service, characteristic, this.getPropertyToSubscribe(service, characteristic));
    }

    this.bindSetEvent(characteristic, service, IDs);
    this.bindGetEvent(characteristic, service, IDs);
  }

  private setServiceProperties(service, IDs) {
    // IDs[0] is always device ID, "0" for security system and "G" for global variables switches
    // IDs[1] is reserved for the button ID for virtual devices, or the global variable name for global variable devices, otherwise is ""
    // IDs[2] is a subdevice type:
    //   "LOCK"        for locks,
    //   "SC"          for Scenes,
    //   "CZ"          for Climate zones,
    //   "HZ"          for heating zones,
    //   "G"           for global variables,
    //   "D"           for dimmer global variables,
    //   "PM2.5"       for PM2.5 sensor
    // IDs[3] is for remote controllers and remote scene controllers and represent the remote controller type:
    //   "CS"          for remote controller central scene,
    //   "SA"          for remote controller scene activation
    // IDs[4] is for remote controllers and remote scene controllers and represent the remote controller button number

    service.isVirtual = IDs[1] !== '';
    service.isSecuritySystem = IDs[0] === '0';
    service.isGlobalVariableSwitch = IDs[0] === 'G';
    service.isGlobalVariableDimmer = IDs[0] === 'D';
    service.isLockSwitch = IDs.length >= 3 && IDs[2] === constants.SUBTYPE_LOCK;
    service.isScene = IDs.length >= 3 && IDs[2] === constants.SUBTYPE_SCENE;
    service.isClimateZone = IDs.length >= 3 && IDs[2] === constants.SUBTYPE_CLIMATE_ZONE;
    service.isHeatingZone = IDs.length >= 3 && IDs[2] === constants.SUBTYPE_HEATING_ZONE;
    service.isOpenCloseOnly = IDs.length >= 3 && IDs[2] === constants.SUBTYPE_OPEN_CLOSE_ONLY;
    service.isPM2_5Sensor = IDs.length >= 3 && IDs[2] === constants.SUBTYPE_PM2_5;
    service.isRemoteControllerCentralScene = IDs.length >= 5 && IDs[3] === constants.SUBTYPE_REMOTE_CONTROLLER_CENTRAL_SCENE;
    service.isRemoteControllerSceneActivation = IDs.length >= 5 && IDs[3] === constants.SUBTYPE_REMOTE_CONTROLLER_SCENE_ACTIVATION;
    service.remoteButtonNumber = IDs.length >= 5 ? parseInt(IDs[4]) : -1;
  }

  private shouldSubscribeToUpdates(service, characteristic) {
    return !service.isVirtual && !service.isScene
      && characteristic.constructor !== this.platform.Characteristic.ValveType;
  }

  private getPropertyToSubscribe(service, characteristic) {
    if (characteristic.constructor === this.platform.Characteristic.Hue
      || characteristic.constructor === this.platform.Characteristic.Saturation) {
      return 'color';
    }
    if (characteristic.constructor === this.platform.Characteristic.CurrentHeatingCoolingState ||
      characteristic.constructor === this.platform.Characteristic.TargetHeatingCoolingState) {
      return 'mode';
    }
    if (characteristic.constructor === this.platform.Characteristic.TargetTemperature) {
      return 'targettemperature';
    }
    if (service.UUID === this.platform.Service.WindowCovering.UUID
      && (characteristic.constructor === this.platform.Characteristic.CurrentHorizontalTiltAngle
      || characteristic.constructor === this.platform.Characteristic.TargetHorizontalTiltAngle)) {
      return 'value2';
    }
    return 'value';
  }

  private bindSetEvent(characteristic, service, IDs) {
    characteristic.on(CharacteristicEventTypes.SET, async (value: CharacteristicValue, callback: CharacteristicSetCallback, context) => {
      this.setCharacteristicValue(value, context, characteristic, service, IDs);
      callback();
    });
  }

  private bindGetEvent(characteristic, service, IDs) {
    characteristic.on(CharacteristicEventTypes.GET, async (callback: CharacteristicGetCallback) => {
      if (this.isStaticCharacteristic(characteristic)) {
        callback(undefined, characteristic.value);
      } else if (this.isVirtualButtonOrScene(service)) {
        callback(undefined, false);
      } else {
        this.getCharacteristicValue(callback, characteristic, service, this.accessory, IDs);
      }
    });
  }

  private isStaticCharacteristic(characteristic) {
    return characteristic.constructor === this.platform.Characteristic.Name
      || characteristic.constructor === this.platform.Characteristic.ValveType;
  }

  private isVirtualButtonOrScene(service) {
    return (service.isVirtual && !service.isGlobalVariableSwitch && !service.isGlobalVariableDimmer) || service.isScene;
  }

  async setCharacteristicValue(value, context, characteristic, service, IDs) {
    if (context !== 'fromFibaro' && context !== 'fromSetValue') {
      if (this.platform.setFunctions) {
        const setFunction = this.platform.setFunctions.setFunctionsMapping.get(characteristic.constructor);
        const poller = this.platform.poller;
        if (poller) {
          poller.cancelPoll();
        }
        if (setFunction) {
          setFunction.call(this.platform.setFunctions, value, context, characteristic, service, IDs);
        }
        if (poller) {
          poller.restartPoll(constants.POLLER_RESTART_AFTER_SET_VALUE);
        }
      }
    }
  }

  async getCharacteristicValue(callback, characteristic, service, accessory, IDs) {
    if (this.platform.config.logsLevel === constants.CONFIG_LOGS_LEVEL_VERBOSE) {
      this.platform.log.info(`${this.device.name} [${IDs[0]}]:`, 'getting', `${characteristic.displayName}`);
    }
    if (!this.platform.fibaroClient) {
      this.platform.log.error('No Fibaro client available.');
      callback(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      return;
    } else {
      // communicate to HomeKit the current value of the characteristic.
      // the logic that follows may update the value or return error in case it is not able to get the updated value
      callback(undefined, characteristic.value);
    }


    try {
      if (service.isSecuritySystem) {
        await this.handleSecuritySystem(characteristic, service, IDs);
      } else if (service.isGlobalVariableSwitch || service.isGlobalVariableDimmer) {
        await this.handleGlobalVariable(characteristic, service, IDs);
      } else {
        await this.handleDefaultCase(characteristic, service, IDs);
      }
    } catch (e) {
      characteristic.updateValue(new Error(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE.toString()));
      this.platform.log.error('G1 - There was a problem getting value from: ', `${IDs[0]} - Err: ${e}`);
    }
  }

  private async handleSecuritySystem(characteristic, service, IDs) {
    const securitySystemStatus = (await this.platform.fibaroClient!.getGlobalVariable(constants.SECURITY_SYSTEM_GLOBAL_VARIABLE)).body;
    this.platform.getFunctions!.getSecuritySystemState(characteristic, service, IDs, securitySystemStatus);
  }

  private async handleGlobalVariable(characteristic, service, IDs) {
    const value = (await this.platform.fibaroClient!.getGlobalVariable(IDs[1])).body;

    const getFunction = this.platform.getFunctions!.getFunctionsMapping.get(characteristic.constructor);
    if (getFunction) {
      getFunction.call(this.platform.getFunctions, characteristic, service, IDs, value);
    }
  }

  private async handleDefaultCase(characteristic, service, IDs) {
    const getFunction = this.platform.getFunctions!.getFunctionsMapping.get(characteristic.constructor);
    if (getFunction) {
      const properties = await this.getDeviceProperties(service, IDs[0]);

      if (this.shouldConvertTemperature(characteristic)) {
        properties.value = this.convertFahrenheitToCelsius(properties.value);
      }

      this.handleDeadDeviceStatus(service, properties, IDs[0]);
      this.callGetFunctionAndHandleResult(getFunction, characteristic, service, IDs, properties);
    } else {
      characteristic.updateValue(new Error(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE.toString()));
      this.platform.log.error('No get function defined for: ', `${characteristic.displayName}`);
    }
  }

  private async getDeviceProperties(service, deviceId) {
    if (!service.isClimateZone && !service.isHeatingZone && this.platform.fibaroClient) {
      return (await this.platform.fibaroClient.getDeviceProperties(deviceId)).body.properties;
    }
    return {};
  }

  private shouldConvertTemperature(characteristic) {
    return this.platform.config.FibaroTemperatureUnit === constants.CONFIG_FIBARO_TEMPERATURE_UNIT_FAHRENHEIT &&
           characteristic.displayName === 'Current Temperature';
  }

  private convertFahrenheitToCelsius(value) {
    return (value - 32) * 5 / 9;
  }

  private handleDeadDeviceStatus(service, properties, deviceId) {
    // Reset deadLogged flag if this is a different service
    if (this.lastServiceChecked !== service) {
      this.lastServiceChecked = service;
      service.deadLogged = false;
    }

    // Log dead status once per service
    if (properties.dead === true && !service.deadLogged) {
      this.platform.log.warn('Device dead: ',
        `${deviceId}  service: ${service.displayName}, reason: ${properties.deadReason}`);
      service.deadLogged = true;
    }
  }

  private callGetFunctionAndHandleResult(getFunction, characteristic, service, IDs, properties) {
    if (properties.dead === true) {
      if (this.platform.config.markDeadDevices) {
        // Report dead status to HomeKit
        characteristic.updateValue(new Error(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE.toString()));
      } else {
        // Do nothing, we already set the last known value before
        return;
      }
    } else {
      getFunction.call(this.platform.getFunctions, characteristic, service, IDs, properties);
    }
  }

  subscribeUpdate(service, characteristic, propertyChanged) {
    const IDs = service.subtype.split('-');
    this.platform.updateSubscriptions.push(
      { 'id': IDs[0], 'service': service, 'characteristic': characteristic, 'property': propertyChanged },
    );
  }

  configureAccessoryFromConfig(devConfig): unknown {
    if (!devConfig) {
      return;
    }
    const Service = this.platform.Service;
    const Characteristic = this.platform.Characteristic;

    if (this.platform.config.logsLevel === constants.CONFIG_LOGS_LEVEL_VERBOSE) {
      this.platform.log.info(`${this.device.name} [id: ${this.device.id}, type: ${this.device.type}]: device found in config`);
    }

    // If the device is excluded in config
    if (devConfig.displayAs === 'exclude') {
      if (this.platform.config.logsLevel > 0) {
        this.platform.log.info(`${this.device.name} [id: ${this.device.id}, type: ${this.device.type}]: device excluded in config`);
      }
      return;
    }

    // Find a matching function based on the name
    const manualConfigFunc = manualDeviceConfigs.get(devConfig.displayAs);

    // If a matching manualConfigFunc was found
    if (manualConfigFunc) {
      // Set the configuration for this device by calling manualConfigFunc
      return manualConfigFunc.call(null, Service, Characteristic, this.device);
    } else {
      // Default to switch if no matching configuration is found
      return [{
        service: Service.Switch,
        characteristics: [Characteristic.On],
        subtype: this.device.id + '----',
      }];
    }
  }

  configureAccessoryFromType() {
    const Service = this.platform.Service;
    const Characteristic = this.platform.Characteristic;
    const type = this.device.type;

    // Find the matching device configuration function
    const deviceConfigFunction = [...autoDeviceConfigs.entries()].find(([key]) =>
      (key instanceof RegExp && key.test(type)) || key === type,
    )?.[1];

    // If a matching deviceConfigFunction was found
    if (deviceConfigFunction) {
      // Set the configuration for this device by calling deviceConfigFunction
      return deviceConfigFunction.call(null, Service, Characteristic, this.device, this.platform.config);
    } else {
      // If no matching DeviceClass was found, log that the device is not supported
      if (this.platform.config.logsLevel > 0) {
        this.platform.log.debug(`${this.device.name} [id: ${this.device.id}, type: ${type}]: device not supported`);
      }
      return;
    }
  }
}