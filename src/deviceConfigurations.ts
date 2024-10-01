// deviceConfigurations.ts

import * as constants from './constants';

const deviceConfigs = new Map<string | RegExp, (Service, Characteristic, device, setMain) => void>();

function DeviceType(type: RegExp | string) {
  return function (target, propertyKey: string) {
    deviceConfigs.set(type, target[propertyKey]);
  };
}

// Configuration for manual device setup
const manualDeviceConfigs = new Map<string, (Service, Characteristic, device, setMain) => void>();

function ManualType(displayAs: string) {
  return function(target, propertyKey: string) {
    manualDeviceConfigs.set(displayAs, target[propertyKey]);
  };
}

export class DeviceConfigurations {
  // Light / Dimmer
  @DeviceType(/^com\.fibaro\.FGD(?!W)/) // Exclude 'com.fibaro.FGDW'
  @DeviceType(/^com\.fibaro\.FGWD/)
  @DeviceType('com.fibaro.multilevelSwitch')
  @DeviceType('com.fibaro.FGD212')
  @DeviceType('com.fibaro.FGWD111')
  static lightWithSwitchOrDimmer(Service, Characteristic, device, setMain) {
    const properties = device.properties || {};
    const controlType = properties.deviceControlType;
    if (controlType === constants.CONTROL_TYPE_LIGHTING ||
      controlType === constants.CONTROL_TYPE_LIGHTING_ALT) {
      setMain(Service.Lightbulb, [Characteristic.On, Characteristic.Brightness]);
    } else {
      setMain(Service.Switch, [Characteristic.On]);
    }
  }

  // Light RGBW
  @DeviceType(/^com\.fibaro\.FGRGBW/)
  @DeviceType('com.fibaro.FGRGBW441M')
  @DeviceType('com.fibaro.colorController')
  static lightWithRGBW(Service, Characteristic, device, setMain) {
    setMain(Service.Lightbulb, [Characteristic.On, Characteristic.Brightness, Characteristic.Hue, Characteristic.Saturation]);
  }

  // Light / Switch / Outlet / Valve
  // for Switch / Double Switch / Smart Implant / etc.
  @DeviceType(/^com\.fibaro\.FGWDS/)
  @DeviceType('com.fibaro.binarySwitch')
  @DeviceType('com.fibaro.developer.bxs.virtualBinarySwitch')
  @DeviceType('com.fibaro.satelOutput')
  @DeviceType('com.fibaro.FGWDS221')
  static variousSwitches(Service, Characteristic, device, setMain) {
    const properties = device.properties || {};
    const controlType = properties.deviceControlType;

    switch (controlType) {
      case constants.CONTROL_TYPE_LIGHTING:
      case constants.CONTROL_TYPE_BEDSIDE_LAMP:
      case constants.CONTROL_TYPE_WALL_LAMP:
        setMain(Service.Lightbulb, [Characteristic.On]);
        break;
      case constants.CONTROL_TYPE_OTHER_DEVICE:
      case constants.CONTROL_TYPE_OTHER_DEVICE_ALT:
        setMain(Service.Switch, [Characteristic.On]);
        break;
      case constants.CONTROL_TYPE_VIDEO_INTERCOM:
      case constants.CONTROL_TYPE_VIDEO_GATE_OPEN:
        setMain(Service.LockMechanism, [
          Characteristic.LockCurrentState,
          Characteristic.LockTargetState,
        ], device.id + '--' + constants.SUBTYPE_LOCK);
        break;
      case constants.CONTROL_TYPE_SPRINKLER:
      case constants.CONTROL_TYPE_VALVE:
        setMain(Service.Valve, [
          Characteristic.Active,
          Characteristic.InUse,
          Characteristic.ValveType,
        ]);
        break;
      default:
        setMain(Service.Outlet, [Characteristic.On, Characteristic.OutletInUse]);
        break;
    }
  }

  // Light / Switch / Outlet / Valve
  // for Wall Plug etc.
  @DeviceType(/^com\.fibaro\.FGWP/)
  @DeviceType(/^com\.fibaro\.FGWOEF/)
  @DeviceType('com.fibaro.FGWP101')
  @DeviceType('com.fibaro.FGWP102')
  @DeviceType('com.fibaro.FGWPG111')
  @DeviceType('com.fibaro.FGWPG121')
  @DeviceType('com.fibaro.FGWOEF011')
  static wallPlugAndOutlet(Service, Characteristic, device, setMain) {
    const properties = device.properties || {};
    const controlType = properties.deviceControlType;

    switch (controlType) {
      case constants.CONTROL_TYPE_LIGHTING:
      case constants.CONTROL_TYPE_BEDSIDE_LAMP:
      case constants.CONTROL_TYPE_WALL_LAMP:
        setMain(Service.Lightbulb, [Characteristic.On]);
        break;
      case constants.CONTROL_TYPE_OTHER_DEVICE:
      case constants.CONTROL_TYPE_OTHER_DEVICE_ALT:
        setMain(Service.Switch, [Characteristic.On]);
        break;
      case constants.CONTROL_TYPE_VIDEO_INTERCOM:
      case constants.CONTROL_TYPE_VIDEO_GATE_OPEN:
        setMain(Service.LockMechanism, [
          Characteristic.LockCurrentState,
          Characteristic.LockTargetState,
        ], device.id + '--' + constants.SUBTYPE_LOCK);
        break;
      case constants.CONTROL_TYPE_SPRINKLER:
      case constants.CONTROL_TYPE_VALVE:
        setMain(Service.Valve, [
          Characteristic.Active,
          Characteristic.InUse,
          Characteristic.ValveType,
        ]);
        break;
      default:
        setMain(Service.Outlet, [Characteristic.On, Characteristic.OutletInUse]);
        break;
    }
  }

  // Window Covering / Garage door
  @DeviceType(/^com\.fibaro\.FGR(?!GBW)/)
  @DeviceType(/^com\.fibaro\.FGRM/)
  @DeviceType(/^com\.fibaro\.FGWR/)
  @DeviceType('com.fibaro.FGR221')
  @DeviceType('com.fibaro.FGRM222')
  @DeviceType('com.fibaro.FGR223')
  @DeviceType('com.fibaro.FGR224')
  @DeviceType('com.fibaro.rollerShutter')
  @DeviceType('com.fibaro.FGWR111')
  @DeviceType('com.fibaro.remoteBaseShutter')
  @DeviceType('com.fibaro.baseShutter')
  @DeviceType('com.fibaro.barrier')
  static windowCoveringAndGarageDoor(Service, Characteristic, device, setMain) {
    const properties = device.properties || {};
    const controlType = properties.deviceControlType;

    // Garage door cases
    if (controlType === constants.CONTROL_TYPE_GATE_WITH_POSITIONING ||
        controlType === constants.CONTROL_TYPE_GARAGE_DOOR ||
        device.type === 'com.fibaro.barrier' ||
        (device.type === 'com.fibaro.baseShutter' && !properties.favoritePositionsNativeSupport)) {
      setMain(Service.GarageDoorOpener, [
        Characteristic.CurrentDoorState,
        Characteristic.TargetDoorState,
        Characteristic.ObstructionDetected,
      ]);
      return;
    }

    // Window covering case
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
    if (device.type === 'com.fibaro.remoteBaseShutter' || device.type === 'com.fibaro.baseShutter') {
      subtype = device.id + '--' + constants.SUBTYPE_OPEN_CLOSE_ONLY;
    }

    setMain(service, characteristics, subtype);
  }

  // Temperature sensor
  @DeviceType('com.fibaro.temperatureSensor')
  static temperatureSensor(Service, Characteristic, device, setMain) {
    setMain(Service.TemperatureSensor, [Characteristic.CurrentTemperature]);
  }

  // Humidity sensor
  @DeviceType('com.fibaro.humiditySensor')
  static humiditySensor(Service, Characteristic, device, setMain) {
    setMain(Service.HumiditySensor, [Characteristic.CurrentRelativeHumidity]);
  }

  // Light sensor
  @DeviceType('com.fibaro.lightSensor')
  static lightSensor(Service, Characteristic, device, setMain) {
    setMain(Service.LightSensor, [Characteristic.CurrentAmbientLightLevel]);
  }

  // Multilevel sensor
  @DeviceType('com.fibaro.multilevelSensor')
  static multilevelSensor(Service, Characteristic, device, setMain) {
    const properties = device.properties || {};
    const deviceRole = properties.deviceRole;

    switch (deviceRole) {
      case constants.DEVICE_ROLE_TEMPERATURE_SENSOR:
        setMain(Service.TemperatureSensor, [Characteristic.CurrentTemperature]);
        break;
      case constants.DEVICE_ROLE_HUMIDITY_SENSOR:
        setMain(Service.HumiditySensor, [Characteristic.CurrentRelativeHumidity]);
        break;
      case constants.DEVICE_ROLE_LIGHT_SENSOR:
      case constants.DEVICE_ROLE_MULTILEVEL_SENSOR:
        setMain(Service.LightSensor, [Characteristic.CurrentAmbientLightLevel]);
        break;
      default:
        throw new Error(`Unsupported device role for multilevel sensor: ${deviceRole}`);
    }
  }

  // Motion sensor
  @DeviceType(/^com\.fibaro\.FGMS/)
  @DeviceType('com.fibaro.FGMS001')
  @DeviceType('com.fibaro.FGMS001v2')
  @DeviceType('com.fibaro.motionSensor')
  static motionSensor(Service, Characteristic, device, setMain) {
    setMain(Service.MotionSensor, [Characteristic.MotionDetected]);
  }

  // Doorbell / Contact sensor
  @DeviceType(/^com\.fibaro\.FGDW/)
  @DeviceType('com.fibaro.binarySensor')
  @DeviceType('com.fibaro.doorSensor')
  @DeviceType('com.fibaro.FGDW002')
  @DeviceType('com.fibaro.windowSensor')
  @DeviceType('com.fibaro.satelZone')
  @DeviceType('com.fibaro.doorWindowSensor')
  static doorbellContactSensor(Service, Characteristic, device, setMain, config) {
    const properties = device.properties || {};
    if (properties.deviceRole === constants.DEVICE_ROLE_MOTION_SENSOR) {
      setMain(Service.MotionSensor, [Characteristic.MotionDetected]);
    } else if (properties.deviceRole === constants.DEVICE_ROLE_PRESENCE_SENSOR) {
      setMain(Service.OccupancySensor, [Characteristic.OccupancyDetected]);
    } else if (device.id === config.doorbellDeviceId) {
      setMain(Service.Doorbell, [Characteristic.ProgrammableSwitchEvent]);
    } else {
      setMain(Service.ContactSensor, [Characteristic.ContactSensorState]);
    }
  }

  // Leak sensor
  @DeviceType(/^com\.fibaro\.FGFS/)
  @DeviceType('com.fibaro.FGFS101')
  @DeviceType('com.fibaro.floodSensor')
  static leakSensor(Service, Characteristic, device, setMain) {
    setMain(Service.LeakSensor, [Characteristic.LeakDetected]);
  }

  // Smoke sensor
  @DeviceType(/^com\.fibaro\.FGSS/)
  @DeviceType('com.fibaro.FGSS001')
  @DeviceType('com.fibaro.smokeSensor')
  @DeviceType('com.fibaro.gasDetector')
  static smokeSensor(Service, Characteristic, device, setMain) {
    setMain(Service.SmokeSensor, [Characteristic.SmokeDetected]);
  }

  // Carbon Monoxide Sensor
  @DeviceType(/^com\.fibaro\.FGCD/)
  @DeviceType('com.fibaro.FGCD001')
  static carbonMonoxideSensor(Service, Characteristic, device, setMain) {
    setMain(Service.CarbonMonoxideSensor, [
      Characteristic.CarbonMonoxideDetected,
      Characteristic.CarbonMonoxideLevel,
      Characteristic.CarbonMonoxidePeakLevel,
      Characteristic.BatteryLevel,
    ]);
  }

  // Lock Mechanism
  @DeviceType('com.fibaro.doorLock')
  @DeviceType('com.fibaro.gerda')
  static lockMechanism(Service, Characteristic, device, setMain) {
    setMain(Service.LockMechanism, [
      Characteristic.LockCurrentState,
      Characteristic.LockTargetState,
    ]);
  }

  // Security system
  @DeviceType(constants.DEVICE_TYPE_SECURITY_SYSTEM)
  static securitySystem(Service, Characteristic, device, setMain) {
    setMain(Service.SecuritySystem, [
      Characteristic.SecuritySystemCurrentState,
      Characteristic.SecuritySystemTargetState,
    ], '0--');
  }

  // Scene
  @DeviceType(constants.DEVICE_TYPE_SCENE)
  static scene(Service, Characteristic, device, setMain) {
    setMain(Service.Switch, [Characteristic.On], device.id + '--' + constants.SUBTYPE_SCENE);
  }

  // Climate zone (HC3)
  @DeviceType(constants.DEVICE_TYPE_CLIMATE_ZONE)
  static climateZone(Service, Characteristic, device, setMain) {
    setMain(Service.Thermostat, [
      Characteristic.CurrentTemperature,
      Characteristic.TargetTemperature,
      Characteristic.CurrentHeatingCoolingState,
      Characteristic.TargetHeatingCoolingState,
      Characteristic.TemperatureDisplayUnits,
    ], device.id + '--' + constants.SUBTYPE_CLIMATE_ZONE);
  }

  // Heating zone (HC2 and HCL)
  @DeviceType(constants.DEVICE_TYPE_HEATING_ZONE)
  static heatingZone(Service, Characteristic, device, setMain) {
    setMain(Service.Thermostat, [
      Characteristic.CurrentTemperature,
      Characteristic.TargetTemperature,
      Characteristic.CurrentHeatingCoolingState,
      Characteristic.TargetHeatingCoolingState,
      Characteristic.TemperatureDisplayUnits,
    ], device.id + '--' + constants.SUBTYPE_HEATING_ZONE);
  }

  // Global variables
  @DeviceType(constants.DEVICE_TYPE_GLOBAL_VARIABLE)
  static globalVariable(Service, Characteristic, device, setMain) {
    setMain(Service.Switch, [Characteristic.On], device.type + '-' + device.name + '-');
  }

  // Dimmer global variables
  @DeviceType(constants.DEVICE_TYPE_DIMMER_GLOBAL_VARIABLE)
  static dimmerGlobalVariable(Service, Characteristic, device, setMain) {
    setMain(Service.Lightbulb, [Characteristic.On, Characteristic.Brightness], device.type + '-' + device.name + '-');
  }
}

export class ManualDeviceConfigurations {
  @ManualType('switch')
  static configureSwitch(Service, Characteristic, device, setMain) {
    setMain(Service.Switch, [Characteristic.On]);
  }

  @ManualType('dimmer')
  static configureDimmer(Service, Characteristic, device, setMain) {
    setMain(Service.Lightbulb, [Characteristic.On, Characteristic.Brightness]);
  }

  @ManualType('blind')
  static configureBlind(Service, Characteristic, device, setMain) {
    setMain(Service.WindowCovering, [
      Characteristic.CurrentPosition,
      Characteristic.TargetPosition,
      Characteristic.PositionState,
      Characteristic.HoldPosition,
    ]);
  }

  @ManualType('blind2')
  static configureBlindWithTilt(Service, Characteristic, device, setMain) {
    setMain(Service.WindowCovering, [
      Characteristic.CurrentPosition,
      Characteristic.TargetPosition,
      Characteristic.PositionState,
      Characteristic.HoldPosition,
      Characteristic.CurrentHorizontalTiltAngle,
      Characteristic.TargetHorizontalTiltAngle,
    ]);
  }

  @ManualType('garage')
  static configureGarage(Service, Characteristic, device, setMain) {
    setMain(Service.GarageDoorOpener, [
      Characteristic.CurrentDoorState,
      Characteristic.TargetDoorState,
      Characteristic.ObstructionDetected,
    ]);
  }

  @ManualType('temperature')
  static configureTemperature(Service, Characteristic, device, setMain) {
    setMain(Service.TemperatureSensor, [Characteristic.CurrentTemperature]);
  }

  @ManualType('humidity')
  static configureHumidity(Service, Characteristic, device, setMain) {
    setMain(Service.HumiditySensor, [Characteristic.CurrentRelativeHumidity]);
  }

  @ManualType('lightSensor')
  static configureLightSensor(Service, Characteristic, device, setMain) {
    setMain(Service.LightSensor, [Characteristic.CurrentAmbientLightLevel]);
  }

  @ManualType('motion')
  static configureMotion(Service, Characteristic, device, setMain) {
    setMain(Service.MotionSensor, [Characteristic.MotionDetected]);
  }

  @ManualType('leak')
  static configureLeak(Service, Characteristic, device, setMain) {
    setMain(Service.LeakSensor, [Characteristic.LeakDetected]);
  }

  @ManualType('smoke')
  static configureSmoke(Service, Characteristic, device, setMain) {
    setMain(Service.SmokeSensor, [Characteristic.SmokeDetected]);
  }
}

export { deviceConfigs, manualDeviceConfigs };