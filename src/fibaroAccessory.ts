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
import { manualDeviceConfigs } from './manualDeviceConfigurations';
import { autoDeviceConfigs } from './autoDeviceConfigurations';

export class FibaroAccessory {
  mainService;
  batteryService;
  mainCharacteristics;
  batteryCharacteristics;
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

    // Set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, manufacturer)
      .setCharacteristic(this.platform.Characteristic.Model, `${this.device.type.length > 1 ?
        this.device.type :
        'HomeCenter Bridged Accessory'}`)
      .setCharacteristic(this.platform.Characteristic.SerialNumber,
        `${properties.serialNumber || '<unknown>'}, ID: ${this.device.id || '<unknown>'}`);

    // Check for device-specific configuration
    const devConfig = this.platform.config.devices?.find(item => item.id === this.device.id);

    // Configure accessory based on config or device type
    if (devConfig) {
      this.configureAccessoryFromConfig(devConfig);
    } else {
      this.configureAccessoryFromType();
    }

    if (!this.isValid) {
      return;
    }

    this.bindCharactersticsEvent(this.mainService, this.mainCharacteristics);

    if (this.device.interfaces && this.device.interfaces.includes('battery')) {
      this.batteryService = this.accessory.getService(this.platform.Service.Battery);
      if (!this.batteryService) {
        this.batteryService = this.accessory.addService(new this.platform.Service.Battery(this.device.name + ' Battery'));
      }
      if (!this.batteryService.subtype) {
        this.batteryService.subtype = this.device.id + '----';
      }
      this.batteryCharacteristics =
        [this.platform.Characteristic.BatteryLevel,
          this.platform.Characteristic.ChargingState,
          this.platform.Characteristic.StatusLowBattery];
      this.bindCharactersticsEvent(this.batteryService, this.batteryCharacteristics);
    }

    // Remove no more existing services
    for (let t = 0; t < this.accessory.services.length; t++) {
      const s = this.accessory.services[t];
      if (s.displayName !== this.mainService.displayName &&
        s.UUID !== this.platform.Service.AccessoryInformation.UUID &&
        s.UUID !== this.platform.Service.Battery.UUID) {
        this.accessory.removeService(s);
      }
    }
  }

  bindCharactersticsEvent(service, characteristics) {
    if (!characteristics) {
      return;
    }
    for (let i = 0; i < characteristics.length; i++) {
      const characteristic = service.getCharacteristic(characteristics[i]);
      if (characteristic.UUID === this.platform.Characteristic.CurrentAmbientLightLevel.UUID) {
        characteristic.props.maxValue = 100000;
        characteristic.props.minStep = 1;
        characteristic.props.minValue = 0;
      }
      if (characteristic.UUID === this.platform.Characteristic.CurrentTemperature.UUID) {
        characteristic.props.minValue = -50;
      }
      if (characteristic.UUID === this.platform.Characteristic.TargetTemperature.UUID) {
        characteristic.props.maxValue = this.platform.config.thermostatmaxtemperature;
      }
      if (characteristic.UUID === this.platform.Characteristic.ValveType.UUID) {
        characteristic.value = this.platform.Characteristic.ValveType.GENERIC_VALVE;
      }
      if (characteristic.UUID === this.platform.Characteristic.AirQuality.UUID) {
        characteristic.value = this.platform.Characteristic.AirQuality.UNKNOWN;
      }
      this.bindCharacteristicEvents(characteristic, service);
    }
  }

  bindCharacteristicEvents(characteristic, service) {
    if (!characteristic || !service || !service.subtype) {
      return;
    }
    const IDs = service.subtype.split('-');
    // IDs[0] is always device ID, "0" for security system and "G" for global variables switches
    // IDs[1] is reserved for the button ID for virtual devices, or the global variable name for global variable devices, otherwise is ""
    // IDs[2] is a subdevice type: "LOCK" for locks, "SC" for Scenes, "CZ" for Climate zones,
    //                             "HZ" for heating zones, "G" for global variables, "D" for dimmer global variables
    service.isVirtual = IDs[1] !== '' ? true : false;
    service.isSecuritySystem = IDs[0] === '0' ? true : false;
    service.isGlobalVariableSwitch = IDs[0] === 'G' ? true : false;
    service.isGlobalVariableDimmer = IDs[0] === 'D' ? true : false;
    service.isLockSwitch = (IDs.length >= 3 && IDs[2] === constants.SUBTYPE_LOCK) ? true : false;
    service.isScene = (IDs.length >= 3 && IDs[2] === constants.SUBTYPE_SCENE) ? true : false;
    service.isClimateZone = (IDs.length >= 3 && IDs[2] === constants.SUBTYPE_CLIMATE_ZONE) ? true : false;
    service.isHeatingZone = (IDs.length >= 3 && IDs[2] === constants.SUBTYPE_HEATING_ZONE) ? true : false;
    service.isOpenCloseOnly = (IDs.length >= 3 && IDs[2] === constants.SUBTYPE_OPEN_CLOSE_ONLY) ? true : false;
    service.isPM2_5Sensor = (IDs.length >= 3 && IDs[2] === constants.SUBTYPE_PM2_5) ? true : false;
    if (!service.isVirtual && !service.isScene
      && characteristic.UUID !== this.platform.Characteristic.ValveType.UUID) {
      let propertyChanged = 'value'; // subscribe to the changes of this property
      if (characteristic.UUID === this.platform.Characteristic.Hue.UUID
        || characteristic.UUID === this.platform.Characteristic.Saturation.UUID) {
        propertyChanged = 'color';
      }
      if (characteristic.UUID === this.platform.Characteristic.CurrentHeatingCoolingState.UUID ||
        characteristic.UUID === this.platform.Characteristic.TargetHeatingCoolingState.UUID) {
        propertyChanged = 'mode';
      }
      if (characteristic.UUID === this.platform.Characteristic.TargetTemperature.UUID) {
        propertyChanged = 'targettemperature';
      }
      if (service.UUID === this.platform.Service.WindowCovering.UUID
        && characteristic.UUID === this.platform.Characteristic.CurrentHorizontalTiltAngle.UUID) {
        propertyChanged = 'value2';
      }
      if (service.UUID === this.platform.Service.WindowCovering.UUID
        && characteristic.UUID === this.platform.Characteristic.TargetHorizontalTiltAngle.UUID) {
        propertyChanged = 'value2';
      }
      this.subscribeUpdate(service, characteristic, propertyChanged);
    }
    characteristic.on(CharacteristicEventTypes.SET, async (value: CharacteristicValue, callback: CharacteristicSetCallback, context) => {
      this.setCharacteristicValue(value, context, characteristic, service, IDs);
      callback();
    });
    characteristic.on(CharacteristicEventTypes.GET, async (callback: CharacteristicGetCallback) => {
      if (characteristic.UUID === this.platform.Characteristic.Name.UUID
        || characteristic.UUID === this.platform.Characteristic.ValveType.UUID) {
        callback(undefined, characteristic.value);
        return;
      }
      if ((service.isVirtual && !service.isGlobalVariableSwitch && !service.isGlobalVariableDimmer) || service.isScene) {
        // a push button is normally off
        callback(undefined, false);
      } else {
        this.getCharacteristicValue(callback, characteristic, service, this.accessory, IDs);
      }
    });
  }

  async setCharacteristicValue(value, context, characteristic, service, IDs) {
    if (context !== 'fromFibaro' && context !== 'fromSetValue') {
      if (this.platform.setFunctions) {
        const setFunction = this.platform.setFunctions.setFunctionsMapping.get(characteristic.UUID);
        const platform = this.platform;
        await this.platform.mutex.runExclusive(async () => {
          if (platform.poller) {
            platform.poller.cancelPoll();
          }
          if (setFunction) {
            setFunction.call(platform.setFunctions, value, context, characteristic, service, IDs);
          }
          if (platform.poller) {
            platform.poller.restartPoll(5000);
          }
        });
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
    }

    try {
      // Handle special cases
      if (service.isSecuritySystem) {
        const securitySystemStatus = (await this.platform.fibaroClient.getGlobalVariable(constants.SECURITY_SYSTEM_GLOBAL_VARIABLE)).body;
        this.platform.getFunctions?.getSecuritySystemState(characteristic, service, IDs, securitySystemStatus);
        callback(undefined, characteristic.value);
      } else if (service.isGlobalVariableSwitch) {
        const switchStatus = (await this.platform.fibaroClient.getGlobalVariable(IDs[1])).body;
        this.platform.getFunctions?.getBool(characteristic, service, IDs, switchStatus);
        callback(undefined, characteristic.value);
      } else if (service.isGlobalVariableDimmer) {
        const value = (await this.platform.fibaroClient.getGlobalVariable(IDs[1])).body;
        if (characteristic.UUID === this.platform.Characteristic.Brightness.UUID) {
          this.platform.getFunctions?.getBrightness(characteristic, service, IDs, value);
        } else if (characteristic.UUID === this.platform.Characteristic.On.UUID) {
          this.platform.getFunctions?.getBool(characteristic, service, IDs, value);
        }
        callback(undefined, characteristic.value);
      } else {
        // Get mapped function and call it
        const getFunction = this.platform.getFunctions?.getFunctionsMapping.get(characteristic.UUID);
        if (getFunction) {
          const properties = await this.getDeviceProperties(service, IDs[0]);

          // Convert temperature if necessary
          if (this.shouldConvertTemperature(characteristic)) {
            properties.value = this.convertFahrenheitToCelsius(properties.value);
          }

          // Handle dead device status
          this.handleDeadDeviceStatus(service, properties, IDs[0]);

          // Call the get function and handle the result
          this.callGetFunctionAndHandleResult(getFunction, characteristic, service, IDs, properties, callback);
        } else {
          callback(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
          this.platform.log.error('No get function defined for: ', `${characteristic.displayName}`);
        }
      }
    } catch (e) {
      callback(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      this.platform.log.error('G1 - There was a problem getting value from: ', `${IDs[0]} - Err: ${e}`);
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

  private callGetFunctionAndHandleResult(getFunction, characteristic, service, IDs, properties, callback) {
    if (properties.dead === true) {
      if (this.platform.config.markDeadDevices) {
        // Report dead status to HomeKit
        callback(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      } else {
        // Return the last known value
        callback(undefined, characteristic.value);
      }
    } else {
      callback(undefined, characteristic.value);
      // The get function call may update the value with updatValue api
      getFunction.call(this.platform.getFunctions, characteristic, service, IDs, properties);
    }
  }

  subscribeUpdate(service, characteristic, propertyChanged) {
    const IDs = service.subtype.split('-');
    this.platform.updateSubscriptions.push(
      { 'id': IDs[0], 'service': service, 'characteristic': characteristic, 'property': propertyChanged },
    );
  }

  configureAccessoryFromConfig(devConfig) {
    const Service = this.platform.Service;
    const Characteristic = this.platform.Characteristic;

    if (this.platform.config.logsLevel === constants.CONFIG_LOGS_LEVEL_VERBOSE) {
      this.platform.log.info(`${this.device.name} [id: ${this.device.id}, type: ${this.device.type}]: device found in config`);
    }

    // Find a matching function based on the name
    const deviceConfigFunction = manualDeviceConfigs.get(devConfig?.displayAs);

    // If a matching deviceConfigFunction was found
    if (deviceConfigFunction) {
      // Set the configuration for this device by calling deviceConfigFunction
      deviceConfigFunction.call(null, Service, Characteristic, this.device, this.setMain.bind(this));

      // If the device is excluded in config
      if (devConfig?.displayAs === 'exclude') {
        if (this.platform.config.logsLevel > 0) {
          this.platform.log.info(`${this.device.name} [id: ${this.device.id}, type: ${this.device.type}]: device excluded in config`);
        }
        this.isValid = false;
      }
    } else {
      // Default to switch if no matching configuration is found
      this.setMain(Service.Switch, [Characteristic.On]);
    }
  }

  configureAccessoryFromType() {
    const Service = this.platform.Service;
    const Characteristic = this.platform.Characteristic;
    const type = this.device.type;

    // Attempt to find a matching function based on the device type
    let deviceConfigFunction;

    // Iterate through the deviceConfigs map
    for (const [key, value] of autoDeviceConfigs) {
      // Check if the key is a RegExp and matches the type, or if the key exactly matches the type
      if ((key instanceof RegExp && key.test(type)) || key === type) {
        deviceConfigFunction = value;
        break;  // Exit the loop once a match is found
      }
    }

    // If a matching deviceConfigFunction was found
    if (deviceConfigFunction) {
      // Set the configuration for this device by calling deviceConfigFunction
      deviceConfigFunction.call(null, Service, Characteristic, this.device, this.setMain.bind(this), this.platform.config);
    } else {
      // If no matching DeviceClass was found, log that the device is not supported
      if (this.platform.config.logsLevel > 0) {
        this.platform.log.info(`${this.device.name} [id: ${this.device.id}, type: ${type}]: device not supported`);
      }
      // Mark this accessory as invalid
      this.isValid = false;
    }
  }

  setMain(service, characteristics, subtype?: string) {
    this.mainService = this.accessory.getService(service);
    if (!this.mainService) {
      this.mainService = this.accessory.addService(
        new service(this.device.name),
      );
    }
    this.mainCharacteristics = characteristics;
    if (subtype === null || subtype === undefined || subtype === '') {
      subtype = this.device.id + '----';
    }
    this.mainService.subtype = subtype;

  }
}