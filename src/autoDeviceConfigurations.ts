// deviceConfigurations.ts

import * as constants from './constants';
import { Service } from 'hap-nodejs';
import { Characteristic } from 'hap-nodejs';


// Configuration for automatic device setup
type DeviceConfigFunction = (device, config?) => {
  service;
  characteristics;
  subtype?: string;
};

const autoDeviceConfigs = new Map<string | RegExp, DeviceConfigFunction>();

// Decorator function for mapping device configurations to the device type
function DeviceType(type: RegExp | string) {
  return function (target, propertyKey: string) {
    autoDeviceConfigs.set(type, target[propertyKey]);
  };
}

export class DeviceConfigurations {
  // Light / Dimmer
  @DeviceType(/^com\.fibaro\.FGD(?!W)/) // Exclude 'com.fibaro.FGDW'
  @DeviceType(/^com\.fibaro\.FGWD/)
  @DeviceType('com.fibaro.multilevelSwitch')
  @DeviceType('com.fibaro.FGD212')
  @DeviceType('com.fibaro.FGWD111')
  static lightWithSwitchOrDimmer(device) {
    const { deviceControlType } = device.properties || {};

    const isLightingControl =
      deviceControlType === constants.CONTROL_TYPE_LIGHTING ||
      deviceControlType === constants.CONTROL_TYPE_LIGHTING_ALT;

    if (isLightingControl) {
      return {
        service: Service.Lightbulb,
        characteristics: [Characteristic.On, Characteristic.Brightness],
      };
    } else {
      return {
        service: Service.Switch,
        characteristics: [Characteristic.On],
      };
    }
  }

  // Light RGBW
  @DeviceType(/^com\.fibaro\.FGRGBW/)
  @DeviceType('com.fibaro.FGRGBW441M')
  @DeviceType('com.fibaro.colorController')
  static lightWithRGBW() {
    return {
      service: Service.Lightbulb,
      characteristics: [Characteristic.On, Characteristic.Brightness, Characteristic.Hue, Characteristic.Saturation],
    };
  }

  // Light / Switch / Outlet / Valve
  // for Switch / Double Switch / Smart Implant / etc.
  @DeviceType(/^com\.fibaro\.FGWDS/)
  @DeviceType('com.fibaro.binarySwitch')
  @DeviceType('com.fibaro.developer.bxs.virtualBinarySwitch')
  @DeviceType('com.fibaro.satelOutput')
  @DeviceType(/^com\.fibaro\.FGWP/)
  @DeviceType(/^com\.fibaro\.FGWOEF/)
  static variousSwitches(device) {
    const { deviceControlType } = device.properties || {};

    const isLightingDevice =
      deviceControlType === constants.CONTROL_TYPE_LIGHTING ||
      deviceControlType === constants.CONTROL_TYPE_BEDSIDE_LAMP ||
      deviceControlType === constants.CONTROL_TYPE_WALL_LAMP;

    const isOtherDevice =
      deviceControlType === constants.CONTROL_TYPE_OTHER_DEVICE ||
      deviceControlType === constants.CONTROL_TYPE_OTHER_DEVICE_ALT;

    const isLockDevice =
      deviceControlType === constants.CONTROL_TYPE_VIDEO_INTERCOM ||
      deviceControlType === constants.CONTROL_TYPE_VIDEO_GATE_OPEN;

    const isValveDevice =
      deviceControlType === constants.CONTROL_TYPE_SPRINKLER ||
      deviceControlType === constants.CONTROL_TYPE_VALVE;

    if (isLightingDevice) {
      return {
        service: Service.Lightbulb,
        characteristics: [Characteristic.On],
      };
    } else if (isOtherDevice) {
      return {
        service: Service.Switch,
        characteristics: [Characteristic.On],
      };
    } else if (isLockDevice) {
      return {
        service: Service.LockMechanism,
        characteristics: [Characteristic.LockCurrentState, Characteristic.LockTargetState],
        subtype: `${device.id}--${constants.SUBTYPE_LOCK}`,
      };
    } else if (isValveDevice) {
      return {
        service: Service.Valve,
        characteristics: [Characteristic.Active, Characteristic.InUse, Characteristic.ValveType],
      };
    } else {
      return {
        service: Service.Outlet,
        characteristics: [Characteristic.On, Characteristic.OutletInUse],
      };
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
  static windowCoveringAndGarageDoor(device) {
    const properties = device.properties || {};
    const { deviceControlType } = properties;

    const isGarageDoor =
      deviceControlType === constants.CONTROL_TYPE_GATE_WITH_POSITIONING ||
      deviceControlType === constants.CONTROL_TYPE_GARAGE_DOOR ||
      device.type === 'com.fibaro.barrier' ||
      (device.type === 'com.fibaro.baseShutter' && !properties.favoritePositionsNativeSupport);

    const isBlindsWithPositioning =
     deviceControlType === constants.CONTROL_TYPE_BLINDS_WITH_POSITIONING;

    const isBaseShutter =
      device.type === 'com.fibaro.baseShutter' ||
      device.type === 'com.fibaro.remoteBaseShutter';

    // Garage door cases
    if (isGarageDoor) {
      return {
        service: Service.GarageDoorOpener,
        characteristics: [
          Characteristic.CurrentDoorState, Characteristic.TargetDoorState, Characteristic.ObstructionDetected],
      };
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
      return {
        service: Service.WindowCovering,
        characteristics: characteristics,
        subtype: device.id + '--' + constants.SUBTYPE_OPEN_CLOSE_ONLY,
      };
    } else {
      return {
        service: Service.WindowCovering,
        characteristics: characteristics,
      };
    }
  }

  // Temperature sensor
  @DeviceType('com.fibaro.temperatureSensor')
  static temperatureSensor() {
    return {
      service: Service.TemperatureSensor,
      characteristics: [Characteristic.CurrentTemperature],
    };
  }

  // Humidity sensor
  @DeviceType('com.fibaro.humiditySensor')
  static humiditySensor() {
    return {
      service: Service.HumiditySensor,
      characteristics: [Characteristic.CurrentRelativeHumidity],
    };
  }

  // Light sensor
  @DeviceType('com.fibaro.lightSensor')
  static lightSensor() {
    return {
      service: Service.LightSensor,
      characteristics: [Characteristic.CurrentAmbientLightLevel],
    };
  }

  // Multilevel sensor
  @DeviceType('com.fibaro.multilevelSensor')
  static multilevelSensor(device) {
    const properties = device.properties || {};
    const { deviceRole } = properties;

    const isTemperatureSensor = deviceRole === constants.DEVICE_ROLE_TEMPERATURE_SENSOR;
    const isHumiditySensor = deviceRole === constants.DEVICE_ROLE_HUMIDITY_SENSOR;
    const isLightSensor =
      deviceRole === constants.DEVICE_ROLE_LIGHT_SENSOR ||
      deviceRole === constants.DEVICE_ROLE_MULTILEVEL_SENSOR;

    if (isTemperatureSensor) {
      return {
        service: Service.TemperatureSensor,
        characteristics: [Characteristic.CurrentTemperature],
      };
    } else if (isHumiditySensor) {
      return {
        service: Service.HumiditySensor,
        characteristics: [Characteristic.CurrentRelativeHumidity],
      };
    } else if (isLightSensor) {
      return {
        service: Service.LightSensor,
        characteristics: [Characteristic.CurrentAmbientLightLevel],
      };
    } else {
      throw new Error(`Unsupported device role for multilevel sensor: ${deviceRole}`);
    }
  }

  // Motion sensor
  @DeviceType(/^com\.fibaro\.FGMS/)
  @DeviceType('com.fibaro.motionSensor')
  static motionSensor() {
    return {
      service: Service.MotionSensor,
      characteristics: [Characteristic.MotionDetected],
    };
  }

  // Doorbell / Contact sensor
  @DeviceType(/^com\.fibaro\.FGDW/)
  @DeviceType('com.fibaro.binarySensor')
  @DeviceType('com.fibaro.doorSensor')
  @DeviceType('com.fibaro.windowSensor')
  @DeviceType('com.fibaro.satelZone')
  @DeviceType('com.fibaro.doorWindowSensor')
  static doorbellContactSensor(device, config) {
    const properties = device.properties || {};
    const { deviceRole } = properties;

    const isMotionSensor = deviceRole === constants.DEVICE_ROLE_MOTION_SENSOR;
    const isPresenceSensor = deviceRole === constants.DEVICE_ROLE_PRESENCE_SENSOR;
    const isDoorbell = device.id === config.doorbellDeviceId;

    if (isMotionSensor) {
      return {
        service: Service.MotionSensor,
        characteristics: [Characteristic.MotionDetected],
      };
    } else if (isPresenceSensor) {
      return {
        service: Service.OccupancySensor,
        characteristics: [Characteristic.OccupancyDetected],
      };
    } else if (isDoorbell) {
      return {
        service: Service.Doorbell,
        characteristics: [Characteristic.ProgrammableSwitchEvent],
      };
    } else {
      return {
        service: Service.ContactSensor,
        characteristics: [Characteristic.ContactSensorState],
      };
    }
  }

  // Leak sensor
  @DeviceType(/^com\.fibaro\.FGFS/)
  @DeviceType('com.fibaro.floodSensor')
  static leakSensor() {
    return {
      service: Service.LeakSensor,
      characteristics: [Characteristic.LeakDetected],
    };
  }

  // Smoke sensor
  @DeviceType(/^com\.fibaro\.FGSS/)
  @DeviceType('com.fibaro.smokeSensor')
  @DeviceType('com.fibaro.gasDetector')
  static smokeSensor() {
    return {
      service: Service.SmokeSensor,
      characteristics: [Characteristic.SmokeDetected],
    };
  }

  // Carbon Monoxide Sensor
  @DeviceType(/^com\.fibaro\.FGCD/)
  static carbonMonoxideSensor() {
    return {
      service: Service.CarbonMonoxideSensor,
      characteristics: [
        Characteristic.CarbonMonoxideDetected,
        Characteristic.CarbonMonoxideLevel,
        Characteristic.CarbonMonoxidePeakLevel,
        Characteristic.BatteryLevel,
      ],
    };
  }

  // Lock Mechanism
  @DeviceType('com.fibaro.doorLock')
  @DeviceType('com.fibaro.gerda')
  static lockMechanism() {
    return {
      service: Service.LockMechanism,
      characteristics: [
        Characteristic.LockCurrentState,
        Characteristic.LockTargetState,
      ],
    };
  }

  // Security system
  @DeviceType(constants.DEVICE_TYPE_SECURITY_SYSTEM)
  static securitySystem() {
    return {
      service: Service.SecuritySystem,
      characteristics: [
        Characteristic.SecuritySystemCurrentState,
        Characteristic.SecuritySystemTargetState,
      ],
      subtype: '0--',
    };
  }

  // Scene
  @DeviceType(constants.DEVICE_TYPE_SCENE)
  static scene(device) {
    return {
      service: Service.Switch,
      characteristics: [Characteristic.On],
      subtype: device.id + '--' + constants.SUBTYPE_SCENE,
    };
  }

  // Climate zone (HC3)
  @DeviceType(constants.DEVICE_TYPE_CLIMATE_ZONE)
  static climateZone(device) {
    return {
      service: Service.Thermostat,
      characteristics: [
        Characteristic.CurrentTemperature,
        Characteristic.TargetTemperature,
        Characteristic.CurrentHeatingCoolingState,
        Characteristic.TargetHeatingCoolingState,
        Characteristic.TemperatureDisplayUnits,
      ],
      subtype: device.id + '--' + constants.SUBTYPE_CLIMATE_ZONE,
    };
  }

  // Heating zone (HC2 and HCL)
  @DeviceType(constants.DEVICE_TYPE_HEATING_ZONE)
  static heatingZone(device) {
    return {
      service: Service.Thermostat,
      characteristics: [
        Characteristic.CurrentTemperature,
        Characteristic.TargetTemperature,
        Characteristic.CurrentHeatingCoolingState,
        Characteristic.TargetHeatingCoolingState,
        Characteristic.TemperatureDisplayUnits,
      ],
      subtype: device.id + '--' + constants.SUBTYPE_HEATING_ZONE,
    };
  }

  // Global variables
  @DeviceType(constants.DEVICE_TYPE_GLOBAL_VARIABLE)
  static globalVariable(device) {
    return {
      service: Service.Switch,
      characteristics: [Characteristic.On],
      subtype: device.type + '-' + device.name + '-',
    };
  }

  // Dimmer global variables
  @DeviceType(constants.DEVICE_TYPE_DIMMER_GLOBAL_VARIABLE)
  static dimmerGlobalVariable(device) {
    return {
      service: Service.Lightbulb,
      characteristics: [Characteristic.On, Characteristic.Brightness],
      subtype: device.type + '-' + device.name + '-',
    };
  }
}

export { autoDeviceConfigs };