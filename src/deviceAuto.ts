// deviceConfigurations.ts

import * as constants from './constants';

// Configuration for automatic device setup
type DeviceConfigFunction = (Service, Characteristic, device, config?, log?) => Array<{
  service;
  characteristics;
  subtype?: string;
}>;

const autoDeviceConfigs = new Map<string | RegExp, DeviceConfigFunction>();

// Decorator function for mapping device configurations to the device type
function DeviceType(type: RegExp | string) {
  return function (target, propertyKey: string) {
    autoDeviceConfigs.set(type, target[propertyKey]);
  };
}

export class DeviceConfigurations {
  constructor() {
  }

  // Light / Dimmer
  @DeviceType(/^com\.fibaro\.FGD(?!W)/) // Exclude 'com.fibaro.FGDW'
  @DeviceType(/^com\.fibaro\.FGWD/)
  @DeviceType('com.fibaro.multilevelSwitch')
  @DeviceType('com.fibaro.FGD212')
  @DeviceType('com.fibaro.FGWD111')
  private static lightWithSwitchOrDimmer(Service, Characteristic, device) {
    const { deviceControlType } = device.properties || {};
    const controlType = typeof deviceControlType === 'string'
      ? parseInt(deviceControlType, 10)
      : deviceControlType;

    const isLightingControl =
      controlType === constants.CONTROL_TYPE_LIGHTING ||
      controlType === constants.CONTROL_TYPE_LIGHTING_ALT;

    if (isLightingControl) {
      return [{
        service: Service.Lightbulb,
        characteristics: [Characteristic.On, Characteristic.Brightness],
        subtype: device.id + '----',
      }];
    } else {
      return [{
        service: Service.Switch,
        characteristics: [Characteristic.On],
        subtype: device.id + '----',
      }];
    }
  }

  // Light RGBW
  @DeviceType(/^com\.fibaro\.FGRGBW/)
  @DeviceType('com.fibaro.colorController')
  private static lightWithRGBW(Service, Characteristic, device) {
    return [{
      service: Service.Lightbulb,
      characteristics: [Characteristic.On, Characteristic.Brightness, Characteristic.Hue, Characteristic.Saturation],
      subtype: device.id + '----',
    }];
  }

  // Light / Switch / Outlet / Valve
  // for Switch / Double Switch / Smart Implant / etc.
  @DeviceType(/^com\.fibaro\.FGWDS/)
  @DeviceType('com.fibaro.binarySwitch')
  @DeviceType('com.fibaro.developer.bxs.virtualBinarySwitch')
  @DeviceType('com.fibaro.satelOutput')
  @DeviceType(/^com\.fibaro\.FGWP/)
  @DeviceType(/^com\.fibaro\.FGWOEF/)
  private static variousSwitches(Service, Characteristic, device) {
    const { deviceControlType } = device.properties || {};
    const controlType = typeof deviceControlType === 'string'
      ? parseInt(deviceControlType, 10)
      : deviceControlType;

    switch (controlType) {
      // Lighting devices
      case constants.CONTROL_TYPE_LIGHTING:
      case constants.CONTROL_TYPE_BEDSIDE_LAMP:
      case constants.CONTROL_TYPE_WALL_LAMP:
        return [{
          service: Service.Lightbulb,
          characteristics: [Characteristic.On],
          subtype: `${device.id}----`,
        }];

      // Other devices
      case constants.CONTROL_TYPE_OTHER_DEVICE:
      case constants.CONTROL_TYPE_OTHER_DEVICE_ALT:
        return [{
          service: Service.Switch,
          characteristics: [Characteristic.On],
          subtype: `${device.id}----`,
        }];

      // Lock devices
      case constants.CONTROL_TYPE_VIDEO_INTERCOM:
      case constants.CONTROL_TYPE_VIDEO_GATE_OPEN:
        return [{
          service: Service.LockMechanism,
          characteristics: [Characteristic.LockCurrentState, Characteristic.LockTargetState],
          subtype: `${device.id}--${constants.SUBTYPE_LOCK}`,
        }];

      // Valve devices
      case constants.CONTROL_TYPE_SPRINKLER:
      case constants.CONTROL_TYPE_VALVE:
        return [{
          service: Service.Valve,
          characteristics: [Characteristic.Active, Characteristic.InUse, Characteristic.ValveType],
          subtype: `${device.id}----`,
        }];

      // Default case
      default:
        return [{
          service: Service.Outlet,
          characteristics: [Characteristic.On, Characteristic.OutletInUse],
          subtype: `${device.id}----`,
        }];
    }
  }

  // Window Covering / Garage door
  @DeviceType(/^com\.fibaro\.FGR(?!GBW)/)
  @DeviceType(/^com\.fibaro\.FGRM/)
  @DeviceType(/^com\.fibaro\.FGWR/)
  @DeviceType('com.fibaro.rollerShutter')
  @DeviceType('com.fibaro.remoteBaseShutter')
  @DeviceType('com.fibaro.baseShutter')
  @DeviceType('com.fibaro.barrier')
  private static windowCoveringAndGarageDoor(Service, Characteristic, device) {
    const properties = device.properties || {};
    const { deviceControlType } = properties;
    const controlType = typeof deviceControlType === 'string'
      ? parseInt(deviceControlType, 10)
      : deviceControlType;

    const isGarageDoor =
      controlType === constants.CONTROL_TYPE_GATE_WITH_POSITIONING ||
      controlType === constants.CONTROL_TYPE_GARAGE_DOOR ||
      device.type === 'com.fibaro.barrier' ||
      (device.type === 'com.fibaro.baseShutter' && !properties.favoritePositionsNativeSupport);

    const isBlindsWithPositioning =
      controlType === constants.CONTROL_TYPE_BLINDS_WITH_POSITIONING;

    const isBaseShutter =
      device.type === 'com.fibaro.baseShutter' ||
      device.type === 'com.fibaro.remoteBaseShutter';

    // Garage door cases
    if (isGarageDoor) {
      return [{
        service: Service.GarageDoorOpener,
        characteristics: [
          Characteristic.CurrentDoorState, Characteristic.TargetDoorState, Characteristic.ObstructionDetected],
        subtype: device.id + '----',
      }];
    }

    // Window covering case
    const characteristics = [
      Characteristic.CurrentPosition,
      Characteristic.TargetPosition,
      Characteristic.PositionState,
      Characteristic.HoldPosition,
    ];

    if (isBlindsWithPositioning) {
      characteristics.push(
        Characteristic.CurrentHorizontalTiltAngle,
        Characteristic.TargetHorizontalTiltAngle,
      );
    }

    if (isBaseShutter) {
      return [{
        service: Service.WindowCovering,
        characteristics: characteristics,
        subtype: device.id + '--' + constants.SUBTYPE_OPEN_CLOSE_ONLY,
      }];
    } else {
      return [{
        service: Service.WindowCovering,
        characteristics: characteristics,
        subtype: device.id + '----',
      }];
    }
  }

  // Temperature sensor
  @DeviceType('com.fibaro.temperatureSensor')
  private static temperatureSensor(Service, Characteristic, device) {
    return [{
      service: Service.TemperatureSensor,
      characteristics: [Characteristic.CurrentTemperature],
      subtype: device.id + '----',
    }];
  }

  // Humidity sensor
  @DeviceType('com.fibaro.humiditySensor')
  private static humiditySensor(Service, Characteristic, device) {
    return [{
      service: Service.HumiditySensor,
      characteristics: [Characteristic.CurrentRelativeHumidity],
      subtype: device.id + '----',
    }];
  }

  // Light sensor
  @DeviceType('com.fibaro.lightSensor')
  private static lightSensor(Service, Characteristic, device) {
    return [{
      service: Service.LightSensor,
      characteristics: [Characteristic.CurrentAmbientLightLevel],
      subtype: device.id + '----',
    }];
  }

  // Multilevel sensor
  @DeviceType('com.fibaro.multilevelSensor')
  private static multilevelSensor(Service, Characteristic, device, config, log) {
    const properties = device.properties || {};
    const { deviceRole } = properties;
    const role = typeof deviceRole === 'string' ? parseInt(deviceRole, 10) : deviceRole;

    switch (role) {
      case constants.DEVICE_ROLE_TEMPERATURE_SENSOR:
        return [{
          service: Service.TemperatureSensor,
          characteristics: [Characteristic.CurrentTemperature],
          subtype: device.id + '----',
        }];

      case constants.DEVICE_ROLE_HUMIDITY_SENSOR:
        return [{
          service: Service.HumiditySensor,
          characteristics: [Characteristic.CurrentRelativeHumidity],
          subtype: device.id + '----',
        }];

      case constants.DEVICE_ROLE_LIGHT_SENSOR:
      case constants.DEVICE_ROLE_MULTILEVEL_SENSOR:
        return [{
          service: Service.LightSensor,
          characteristics: [Characteristic.CurrentAmbientLightLevel],
          subtype: device.id + '----',
        }];

      default:
        log.debug(`Unsupported device role for ID: ${device.id}, type: ${device.type}, role: ${deviceRole}`);
        return;
    }
  }

  // Motion sensor
  @DeviceType(/^com\.fibaro\.FGMS/)
  @DeviceType('com.fibaro.motionSensor')
  private static motionSensor(Service, Characteristic, device) {
    return [{
      service: Service.MotionSensor,
      characteristics: [Characteristic.MotionDetected],
      subtype: device.id + '----',
    }];
  }

  // Doorbell / Contact sensor
  @DeviceType(/^com\.fibaro\.FGDW/)
  @DeviceType('com.fibaro.binarySensor')
  @DeviceType('com.fibaro.doorSensor')
  @DeviceType('com.fibaro.windowSensor')
  @DeviceType('com.fibaro.satelZone')
  @DeviceType('com.fibaro.doorWindowSensor')
  private static doorbellContactSensor(Service, Characteristic, device, config) {
    const properties = device.properties || {};
    const { deviceRole } = properties;
    const role = typeof deviceRole === 'string' ? parseInt(deviceRole, 10) : deviceRole;

    switch (true) {
      case role === constants.DEVICE_ROLE_MOTION_SENSOR || properties.deviceRole === 'MotionSensor':
        return [{
          service: Service.MotionSensor,
          characteristics: [Characteristic.MotionDetected],
          subtype: device.id + '----',
        }];

      case role === constants.DEVICE_ROLE_PRESENCE_SENSOR:
        return [{
          service: Service.OccupancySensor,
          characteristics: [Characteristic.OccupancyDetected],
          subtype: device.id + '----',
        }];

      case device.id === config.doorbellDeviceId:
        return [{
          service: Service.Doorbell,
          characteristics: [Characteristic.ProgrammableSwitchEvent],
          subtype: device.id + '----',
        }];

      default:
        return [{
          service: Service.ContactSensor,
          characteristics: [Characteristic.ContactSensorState],
          subtype: device.id + '----',
        }];
    }
  }

  // Leak sensor
  @DeviceType(/^com\.fibaro\.FGFS/)
  @DeviceType('com.fibaro.floodSensor')
  private static leakSensor(Service, Characteristic, device) {
    return [{
      service: Service.LeakSensor,
      characteristics: [Characteristic.LeakDetected],
      subtype: device.id + '----',
    }];
  }

  // Smoke sensor
  @DeviceType(/^com\.fibaro\.FGSS/)
  @DeviceType('com.fibaro.smokeSensor')
  @DeviceType('com.fibaro.gasDetector')
  private static smokeSensor(Service, Characteristic, device) {
    return [{
      service: Service.SmokeSensor,
      characteristics: [Characteristic.SmokeDetected],
      subtype: device.id + '----',
    }];
  }

  // Carbon Monoxide Sensor
  @DeviceType(/^com\.fibaro\.FGCD/)
  private static carbonMonoxideSensor(Service, Characteristic, device) {
    return [{
      service: Service.CarbonMonoxideSensor,
      characteristics: [
        Characteristic.CarbonMonoxideDetected,
        Characteristic.CarbonMonoxideLevel,
        Characteristic.CarbonMonoxidePeakLevel,
        Characteristic.BatteryLevel,
      ],
      subtype: device.id + '----',
    }];
  }

  // Lock Mechanism
  @DeviceType('com.fibaro.doorLock')
  @DeviceType('com.fibaro.gerda')
  private static lockMechanism(Service, Characteristic, device) {
    return [{
      service: Service.LockMechanism,
      characteristics: [
        Characteristic.LockCurrentState,
        Characteristic.LockTargetState,
      ],
      subtype: device.id + '----',
    }];
  }

  // Remote controller and remote scene controller
  @DeviceType('com.fibaro.remoteController')
  @DeviceType('com.fibaro.remoteSceneController')
  @DeviceType(/^com\.fibaro\.FGPB/)
  private static remoteController(Service, Characteristic, device) {
    let availableScenes = device.properties.availableScenes || [];
    let centralSceneSupport = device.properties.centralSceneSupport || [];

    // Parse availableScenes if it's a string
    if (typeof availableScenes === 'string') {
      try {
        availableScenes = JSON.parse(availableScenes);
      } catch {
        availableScenes = [];
      }
    }
    // Parse centralSceneSupport if it's a string
    if (typeof centralSceneSupport === 'string') {
      try {
        centralSceneSupport = JSON.parse(centralSceneSupport);
      } catch {
        centralSceneSupport = [];
      }
    }

    // Ensure availableScenes is an array and not empty
    if (Array.isArray(availableScenes) && availableScenes.length > 0) {
      const numberOfButtons = Math.ceil(availableScenes.length / 2);
      return Array.from({ length: numberOfButtons }, (_, index) => ({
        service: Service.StatelessProgrammableSwitch,
        characteristics: [
          Characteristic.ProgrammableSwitchEvent,
          Characteristic.ServiceLabelIndex,
        ],
        subtype: `${device.id}---${constants.SUBTYPE_REMOTE_CONTROLLER_SCENE_ACTIVATION}-${index + 1}`,
      }));
    } else if (Array.isArray(centralSceneSupport) && centralSceneSupport.length > 0) { // Fibaro button like devices
      return centralSceneSupport.map(keys => ({
        service: Service.StatelessProgrammableSwitch,
        characteristics: [
          Characteristic.ProgrammableSwitchEvent,
          Characteristic.ServiceLabelIndex,
        ],
        subtype: `${device.id}---${constants.SUBTYPE_REMOTE_CONTROLLER_CENTRAL_SCENE}-${keys.keyId}`,
      }));
    }
    // No supported configuration is found
    return;
  }

  // Radiator thermostatic valve.
  @DeviceType('com.fibaro.thermostatDanfoss')
  @DeviceType('com.fibaro.FGT001')
  private static radiatorThermostaticValve(Service, Characteristic, device) {
    return [{
      service: Service.Thermostat,
      characteristics: [
        Characteristic.CurrentTemperature,
        Characteristic.TargetTemperature,
        Characteristic.CurrentHeatingCoolingState,
        Characteristic.TargetHeatingCoolingState,
        Characteristic.TemperatureDisplayUnits,
      ],
      subtype: device.id + '--' + constants.SUBTYPE_RADIATOR_THERMOSTATIC_VALVE,
    }];
  }

  // Security system
  @DeviceType(constants.DEVICE_TYPE_SECURITY_SYSTEM)
  private static securitySystem(Service, Characteristic) {
    return [{
      service: Service.SecuritySystem,
      characteristics: [
        Characteristic.SecuritySystemCurrentState,
        Characteristic.SecuritySystemTargetState,
      ],
      subtype: '0--',
    }];
  }

  // Scene
  @DeviceType(constants.DEVICE_TYPE_SCENE)
  private static scene(Service, Characteristic, device) {
    return [{
      service: Service.Switch,
      characteristics: [Characteristic.On],
      subtype: device.id + '--' + constants.SUBTYPE_SCENE,
    }];
  }

  // Climate zone (HC3)
  @DeviceType(constants.DEVICE_TYPE_CLIMATE_ZONE)
  private static climateZone(Service, Characteristic, device) {
    return [{
      service: Service.Thermostat,
      characteristics: [
        Characteristic.CurrentTemperature,
        Characteristic.TargetTemperature,
        Characteristic.CurrentHeatingCoolingState,
        Characteristic.TargetHeatingCoolingState,
        Characteristic.TemperatureDisplayUnits,
      ],
      subtype: device.id + '--' + constants.SUBTYPE_CLIMATE_ZONE,
    }];
  }

  // Heating zone (HC2 and HCL)
  @DeviceType(constants.DEVICE_TYPE_HEATING_ZONE)
  private static heatingZone(Service, Characteristic, device) {
    return [{
      service: Service.Thermostat,
      characteristics: [
        Characteristic.CurrentTemperature,
        Characteristic.TargetTemperature,
        Characteristic.CurrentHeatingCoolingState,
        Characteristic.TargetHeatingCoolingState,
        Characteristic.TemperatureDisplayUnits,
      ],
      subtype: device.id + '--' + constants.SUBTYPE_HEATING_ZONE,
    }];
  }

  // Global variables
  @DeviceType(constants.DEVICE_TYPE_GLOBAL_VARIABLE)
  private static globalVariable(Service, Characteristic, device) {
    return [{
      service: Service.Switch,
      characteristics: [Characteristic.On],
      subtype: device.type + '-' + device.name + '-',
    }];
  }

  // Dimmer global variables
  @DeviceType(constants.DEVICE_TYPE_DIMMER_GLOBAL_VARIABLE)
  private static dimmerGlobalVariable(Service, Characteristic, device) {
    return [{
      service: Service.Lightbulb,
      characteristics: [Characteristic.On, Characteristic.Brightness],
      subtype: device.type + '-' + device.name + '-',
    }];
  }
}

export { autoDeviceConfigs };
