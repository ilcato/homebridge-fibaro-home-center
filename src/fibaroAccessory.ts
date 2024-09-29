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

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, manufacturer)
      .setCharacteristic(this.platform.Characteristic.Model, `${this.device.type.length > 1 ?
        this.device.type :
        'HomeCenter Bridged Accessory'}`)
      .setCharacteristic(this.platform.Characteristic.SerialNumber,
        `${properties.serialNumber || '<unknown>'}, ID: ${this.device.id || '<unknown>'}`);

    const controlType = parseInt(properties.deviceControlType);

    // Check for device-specific configuration
    const devConfig = this.platform.config.devices?.find(item => item.id === this.device.id);
    // Configure accessory based on config or device type
    if (devConfig) {
      this.configureAccessoryFromConfig(devConfig);
    } else {
      this.configureAccessoryFromType(controlType, properties);
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
          let properties;
          if (!service.isClimateZone && !service.isHeatingZone) {
            properties = (await this.platform.fibaroClient.getDeviceProperties(IDs[0])).body.properties;
          } else {
            properties = {};
          }
          if (this.platform.config.FibaroTemperatureUnit === constants.CONFIG_FIBARO_TEMPERATURE_UNIT_FAHRENHEIT &&
              properties.value && characteristic.displayName === 'Current Temperature') {
            properties.value = (properties.value - 32) * 5 / 9;
          }
          // Reset deadLogged flag if this is a different service
          if (this.lastServiceChecked !== service) {
            this.lastServiceChecked = service;
            service.deadLogged = false;
          }
          // Log dead status once per service
          if (properties.dead === true && !service.deadLogged) {
            this.platform.log.warn('Device dead: ',
              `${IDs[0]}  service: ${service.displayName}, reason: ${properties.deadReason}`);
            service.deadLogged = true; // Mark that we've logged for this service
          }
          // Report dead status to HomeKit if markDeadDevices is true
          if (properties.dead === true && this.platform.config.markDeadDevices) {
            callback(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
          } else if (properties.dead === true && !this.platform.config.markDeadDevices) {
            callback(undefined, characteristic.value); // Return the last known value
          } else {
            callback(undefined, characteristic.value); // The get function call may update the value with updatValue api
            getFunction.call(this.platform.getFunctions, characteristic, service, IDs, properties);
          }
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

    switch (devConfig?.displayAs) {
      case 'exclude':
        if (this.platform.config.logsLevel > 0) {
          this.platform.log.info(`${this.device.name} [id: ${this.device.id}, type: ${this.device.type}]: device excluded in config`);
        }
        this.isValid = false;
        return;
      case 'switch':
        this.setMain(Service.Switch, [Characteristic.On]);
        break;
      case 'dimmer':
        this.setMain(Service.Lightbulb, [Characteristic.On, Characteristic.Brightness]);
        break;
      case 'blind':
        this.setMain(Service.WindowCovering, [
          Characteristic.CurrentPosition,
          Characteristic.TargetPosition,
          Characteristic.PositionState,
          Characteristic.HoldPosition,
        ]);
        break;
      case 'blind2':
        this.setMain(Service.WindowCovering, [
          Characteristic.CurrentPosition,
          Characteristic.TargetPosition,
          Characteristic.PositionState,
          Characteristic.HoldPosition,
          Characteristic.CurrentHorizontalTiltAngle,
          Characteristic.TargetHorizontalTiltAngle,
        ]);
        break;
      case 'garage':
        this.setMain(Service.GarageDoorOpener, [
          Characteristic.CurrentDoorState,
          Characteristic.TargetDoorState,
          Characteristic.ObstructionDetected,
        ]);
        break;
      case 'temperature':
        this.setMain(Service.TemperatureSensor, [Characteristic.CurrentTemperature]);
        break;
      case 'humidity':
        this.setMain(Service.HumiditySensor, [Characteristic.CurrentRelativeHumidity]);
        break;
      case 'lightSensor':
        this.setMain(Service.LightSensor, [Characteristic.CurrentAmbientLightLevel]);
        break;
      case 'motion':
        this.setMain(Service.MotionSensor, [Characteristic.MotionDetected]);
        break;
      case 'leak':
        this.setMain(Service.LeakSensor, [Characteristic.LeakDetected]);
        break;
      case 'smoke':
        this.setMain(Service.SmokeSensor, [Characteristic.SmokeDetected]);
        break;
      case 'security':
        this.setMain(Service.SecuritySystem, [
          Characteristic.SecuritySystemCurrentState,
          Characteristic.SecuritySystemTargetState,
        ], '0--');
        break;
      case 'airQualitySensorPm25':
        this.setMain(Service.AirQualitySensor, [
          Characteristic.AirQuality,
          Characteristic.PM2_5Density,
        ], this.device.id + '--' + constants.SUBTYPE_PM2_5);
        break;
      default:
        this.setMain(Service.Switch, [Characteristic.On]);
        break;
    }
  }

  configureAccessoryFromType(controlType, properties) {
    const Service = this.platform.Service;
    const Characteristic = this.platform.Characteristic;
    const type = this.device.type;

    switch (true) {
      // Light / Dimmer
      case (type.startsWith('com.fibaro.FGD') && !type.startsWith('com.fibaro.FGDW')):
      case (type.startsWith('com.fibaro.FGWD')):
      case (type === 'com.fibaro.multilevelSwitch'):
      case (type === 'com.fibaro.FGD212'):
      case (type === 'com.fibaro.FGWD111'):
        switch (controlType) {
          case constants.CONTROL_TYPE_LIGHTING:
          case constants.CONTROL_TYPE_LIGHTING_ALT:
            this.setMain(Service.Lightbulb, [Characteristic.On, Characteristic.Brightness]);
            break;
          default:
            this.setMain(Service.Switch, [Characteristic.On]);
            break;
        }
        break;
      // Light RGBW
      case (type.startsWith('com.fibaro.FGRGBW')):
      case (type === 'com.fibaro.FGRGBW441M'):
      case (type === 'com.fibaro.colorController'):
      case (type === 'com.fibaro.FGRGBW442'):
      case (type === 'com.fibaro.FGRGBW442CC'):
        this.setMain(Service.Lightbulb, [
          Characteristic.On,
          Characteristic.Brightness,
          Characteristic.Hue,
          Characteristic.Saturation,
        ]);
        break;
      // Light / Switch / Outlet / Valve
      // for Switch / Double Switch / Smart Implant / etc.
      case (type.startsWith('com.fibaro.FGWDS')):
      case (type === 'com.fibaro.binarySwitch'):
      case (type === 'com.fibaro.developer.bxs.virtualBinarySwitch'):
      case (type === 'com.fibaro.satelOutput'):
      case (type === 'com.fibaro.FGWDS221'):
        switch (controlType) {
          case constants.CONTROL_TYPE_LIGHTING:
          case constants.CONTROL_TYPE_BEDSIDE_LAMP:
          case constants.CONTROL_TYPE_WALL_LAMP:
            this.setMain(Service.Lightbulb, [Characteristic.On]);
            break;
          case constants.CONTROL_TYPE_OTHER_DEVICE:
          case constants.CONTROL_TYPE_OTHER_DEVICE_ALT:
            this.setMain(Service.Switch, [Characteristic.On]);
            break;
          case constants.CONTROL_TYPE_VIDEO_INTERCOM:
          case constants.CONTROL_TYPE_VIDEO_GATE_OPEN:
            this.setMain(Service.LockMechanism, [
              Characteristic.LockCurrentState,
              Characteristic.LockTargetState,
            ], this.device.id + '--' + constants.SUBTYPE_LOCK);
            break;
          case constants.CONTROL_TYPE_SPRINKLER:
          case constants.CONTROL_TYPE_VALVE:
            this.setMain(Service.Valve, [
              Characteristic.Active,
              Characteristic.InUse,
              Characteristic.ValveType,
            ]);
            break;
          default:
            this.setMain(Service.Outlet, [Characteristic.On, Characteristic.OutletInUse]);
            break;
        }
        break;
      // Light / Switch / Outlet / Valve
      // for Wall Plug etc.
      case (type.startsWith('com.fibaro.FGWP')):
      case (type.startsWith('com.fibaro.FGWPG')):
      case (type.startsWith('com.fibaro.FGWOEF')):
      case (type === 'com.fibaro.FGWP101'):
      case (type === 'com.fibaro.FGWP102'):
      case (type === 'com.fibaro.FGWPG111'):
      case (type === 'com.fibaro.FGWPG121'):
      case (type === 'com.fibaro.FGWOEF011'):
        switch (controlType) {
          case constants.CONTROL_TYPE_LIGHTING:
          case constants.CONTROL_TYPE_BEDSIDE_LAMP:
          case constants.CONTROL_TYPE_WALL_LAMP:
            this.setMain(Service.Lightbulb, [Characteristic.On]);
            break;
          case constants.CONTROL_TYPE_OTHER_DEVICE:
          case constants.CONTROL_TYPE_OTHER_DEVICE_ALT:
            this.setMain(Service.Switch, [Characteristic.On]);
            break;
          case constants.CONTROL_TYPE_VIDEO_INTERCOM:
          case constants.CONTROL_TYPE_VIDEO_GATE_OPEN:
            this.setMain(Service.LockMechanism, [
              Characteristic.LockCurrentState,
              Characteristic.LockTargetState,
            ], this.device.id + '--' + constants.SUBTYPE_LOCK);
            break;
          case constants.CONTROL_TYPE_SPRINKLER:
          case constants.CONTROL_TYPE_VALVE:
            this.setMain(Service.Valve, [
              Characteristic.Active,
              Characteristic.InUse,
              Characteristic.ValveType,
            ]);
            break;
          default:
            this.setMain(Service.Outlet, [Characteristic.On, Characteristic.OutletInUse]);
            break;
        }
        break;
      // Window Covering / Garage door
      case (type.startsWith('com.fibaro.FGR') && !type.startsWith('com.fibaro.FGRGBW')):
      case (type.startsWith('com.fibaro.FGRM')):
      case (type.startsWith('com.fibaro.FGWR')):
      case (type === 'com.fibaro.FGR221'):
      case (type === 'com.fibaro.FGRM222'):
      case (type === 'com.fibaro.FGR223'):
      case (type === 'com.fibaro.FGR224'):
      case (type === 'com.fibaro.rollerShutter'):
      case (type === 'com.fibaro.FGWR111'):
      case (type === 'com.fibaro.remoteBaseShutter'):
      case (type === 'com.fibaro.baseShutter'): // only if favoritePositionsNativeSupport is true otherwise it's a garage door
        // it's a garage door
        // case 57 - gate with positioning
        if (controlType === constants.CONTROL_TYPE_GATE_WITH_POSITIONING || controlType === constants.CONTROL_TYPE_GARAGE_DOOR) {
          this.setMain(Service.GarageDoorOpener, [
            Characteristic.CurrentDoorState,
            Characteristic.TargetDoorState,
            Characteristic.ObstructionDetected,
          ]);
          break;
        } else if (this.device.type !== 'com.fibaro.baseShutter' ||
                   this.device.type === 'com.fibaro.baseShutter' && properties.favoritePositionsNativeSupport) {
          const service = Service.WindowCovering;
          const characteristics = [
            Characteristic.CurrentPosition,
            Characteristic.TargetPosition,
            Characteristic.PositionState,
            Characteristic.HoldPosition,
          ];
          if (controlType === constants.CONTROL_TYPE_BLINDS_WITH_POSITIONING) {
            characteristics.push(
              Characteristic.CurrentHorizontalTiltAngle,
              Characteristic.TargetHorizontalTiltAngle,
            );
          }
          let subtype = '';
          if (this.device.type === 'com.fibaro.remoteBaseShutter' || this.device.type === 'com.fibaro.baseShutter') {
            subtype = this.device.id + '--' + constants.SUBTYPE_OPEN_CLOSE_ONLY;
          }
          this.setMain(service, characteristics, subtype);
          break;
        }
      // Garage door
      // eslint-disable-next-line no-duplicate-case, no-fallthrough
      case (type === 'com.fibaro.baseShutter'):
      case (type === 'com.fibaro.barrier'):
        this.setMain(Service.GarageDoorOpener, [
          Characteristic.CurrentDoorState,
          Characteristic.TargetDoorState,
          Characteristic.ObstructionDetected,
        ]);
        break;
      // Temperature sensor
      case (type === 'com.fibaro.temperatureSensor'):
        this.setMain(Service.TemperatureSensor, [Characteristic.CurrentTemperature]);
        break;
      // Humidity sensor
      case (type === 'com.fibaro.humiditySensor'):
        this.setMain(Service.HumiditySensor, [Characteristic.CurrentRelativeHumidity]);
        break;
      // Light sensor
      case (type === 'com.fibaro.lightSensor'):
        this.setMain(Service.LightSensor, [Characteristic.CurrentAmbientLightLevel]);
        break;
      // Temperature sensor / Humidity sensor / Light sensor
      case (type === 'com.fibaro.multilevelSensor'):
        switch (properties.deviceRole) {
          case constants.DEVICE_ROLE_TEMPERATURE_SENSOR:
            this.setMain(Service.TemperatureSensor, [Characteristic.CurrentTemperature]);
            break;
          case constants.DEVICE_ROLE_HUMIDITY_SENSOR:
            this.setMain(Service.HumiditySensor, [Characteristic.CurrentRelativeHumidity]);
            break;
          case constants.DEVICE_ROLE_LIGHT_SENSOR:
          case constants.DEVICE_ROLE_MULTILEVEL_SENSOR:
            this.setMain(Service.LightSensor, [Characteristic.CurrentAmbientLightLevel]);
            break;
          default:
            this.isValid = false;
            break;
        }
        break;
      // Motion sensor
      case (type.startsWith('com.fibaro.FGMS')):
      case (type === 'com.fibaro.FGMS001'):
      case (type === 'com.fibaro.FGMS001v2'):
      case (type === 'com.fibaro.motionSensor'):
        this.setMain(Service.MotionSensor, [Characteristic.MotionDetected]);
        break;
      // Doorbell / Contact sensor
      case (type.startsWith('com.fibaro.FGDW')):
      case (type === 'com.fibaro.binarySensor'):
      case (type === 'com.fibaro.doorSensor'):
      case (type === 'com.fibaro.FGDW002'):
      case (type === 'com.fibaro.windowSensor'):
      case (type === 'com.fibaro.satelZone'):
      case (type === 'com.fibaro.doorWindowSensor'):
        if (properties.deviceRole === constants.DEVICE_ROLE_MOTION_SENSOR) {
          this.setMain(Service.MotionSensor, [Characteristic.MotionDetected]);
        } else if (properties.deviceRole === constants.DEVICE_ROLE_PRESENCE_SENSOR) {
          this.setMain(Service.OccupancySensor, [Characteristic.OccupancyDetected]);
        } else if (this.device.id === this.platform.config.doorbellDeviceId) {
          this.setMain(Service.Doorbell, [Characteristic.ProgrammableSwitchEvent]);
        } else {
          this.setMain(Service.ContactSensor, [Characteristic.ContactSensorState]);
        }
        break;
      // Leak sensor
      case (type.startsWith('com.fibaro.FGFS')):
      case (type === 'com.fibaro.FGFS101'):
      case (type === 'com.fibaro.floodSensor'):
        this.setMain(Service.LeakSensor, [Characteristic.LeakDetected]);
        break;
      // Smoke sensor
      case (type.startsWith('com.fibaro.FGSS')):
      case (type === 'com.fibaro.FGSS001'):
      case (type === 'com.fibaro.smokeSensor'):
      case (type === 'com.fibaro.gasDetector'):
        this.setMain(Service.SmokeSensor, [Characteristic.SmokeDetected]);
        break;
      // Carbon Monoxide Sensor
      case (type.startsWith('com.fibaro.FGCD')):
      case (type === 'com.fibaro.FGCD001'):
        this.setMain(Service.CarbonMonoxideSensor, [
          Characteristic.CarbonMonoxideDetected,
          Characteristic.CarbonMonoxideLevel,
          Characteristic.CarbonMonoxidePeakLevel,
          Characteristic.BatteryLevel,
        ]);
        break;
      // Lock Mechanism
      case (type === 'com.fibaro.doorLock'):
      case (type === 'com.fibaro.gerda'):
        this.setMain(Service.LockMechanism, [
          Characteristic.LockCurrentState,
          Characteristic.LockTargetState,
        ]);
        break;
        // Security system
      case (type === constants.DEVICE_TYPE_SECURITY_SYSTEM):
        this.setMain(Service.SecuritySystem, [
          Characteristic.SecuritySystemCurrentState,
          Characteristic.SecuritySystemTargetState,
        ], '0--');
        break;
      // Scene
      case (type === constants.DEVICE_TYPE_SCENE):
        this.setMain(Service.Switch, [Characteristic.On], this.device.id + '--' + constants.SUBTYPE_SCENE);
        break;
      // Climate zone (HC3)
      case (type === constants.DEVICE_TYPE_CLIMATE_ZONE):
        this.setMain(Service.Thermostat, [
          Characteristic.CurrentTemperature,
          Characteristic.TargetTemperature,
          Characteristic.CurrentHeatingCoolingState,
          Characteristic.TargetHeatingCoolingState,
          Characteristic.TemperatureDisplayUnits,
        ], this.device.id + '--' + constants.SUBTYPE_CLIMATE_ZONE);
        break;
      // Heating zone (HC2 and HCL)
      case (type === constants.DEVICE_TYPE_HEATING_ZONE):
        this.setMain(Service.Thermostat, [
          Characteristic.CurrentTemperature,
          Characteristic.TargetTemperature,
          Characteristic.CurrentHeatingCoolingState,
          Characteristic.TargetHeatingCoolingState,
          Characteristic.TemperatureDisplayUnits,
        ], this.device.id + '--' + constants.SUBTYPE_HEATING_ZONE);
        break;
      // Global variables
      case (type === constants.DEVICE_TYPE_GLOBAL_VARIABLE):
        this.setMain(Service.Switch, [Characteristic.On], this.device.type + '-' + this.device.name + '-');
        break;
        // Dimmer global variables
      case (type === constants.DEVICE_TYPE_DIMMER_GLOBAL_VARIABLE):
        this.setMain(Service.Lightbulb, [Characteristic.On, Characteristic.Brightness], this.device.type + '-' + this.device.name + '-');
        break;
      default:
        if (this.platform.config.logsLevel > 0) {
          this.platform.log.info(`${this.device.name} [id: ${this.device.id}, type: ${this.device.type}]: device not supported`);
        }
        this.isValid = false;
        return;
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