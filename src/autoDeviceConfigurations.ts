// deviceConfigurations.ts

import * as constants from './constants';


// Configuration for automatic device setup
const autoDeviceConfigs = new Map<string | RegExp, (Service, Characteristic, device, setMain) => void>();

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
  static lightWithSwitchOrDimmer(Service, Characteristic, device, setMain) {
    const { deviceControlType } = device.properties || {};

    const isLightingControl =
      deviceControlType === constants.CONTROL_TYPE_LIGHTING ||
      deviceControlType === constants.CONTROL_TYPE_LIGHTING_ALT;

    if (isLightingControl) {
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
  @DeviceType(/^com\.fibaro\.FGWP/)
  @DeviceType(/^com\.fibaro\.FGWOEF/)
  static variousSwitches(Service, Characteristic, device, setMain) {
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
      setMain(Service.Lightbulb, [Characteristic.On]);
    } else if (isOtherDevice) {
      setMain(Service.Switch, [Characteristic.On]);
    } else if (isLockDevice) {
      setMain(Service.LockMechanism, [Characteristic.LockCurrentState, Characteristic.LockTargetState],
        `${device.id}--${constants.SUBTYPE_LOCK}`);
    } else if (isValveDevice) {
      setMain(Service.Valve, [Characteristic.Active, Characteristic.InUse, Characteristic.ValveType]);
    } else {
      setMain(Service.Outlet, [Characteristic.On, Characteristic.OutletInUse]);
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
  static windowCoveringAndGarageDoor(Service, Characteristic, device, setMain) {
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
      setMain(Service.GarageDoorOpener, [
        Characteristic.CurrentDoorState, Characteristic.TargetDoorState, Characteristic.ObstructionDetected]);
      return;
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
      const subtype = device.id + '--' + constants.SUBTYPE_OPEN_CLOSE_ONLY;
      setMain(Service.WindowCovering, characteristics, subtype);
    } else {
      setMain(Service.WindowCovering, characteristics);
    }
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
    const { deviceRole } = properties;

    const isTemperatureSensor = deviceRole === constants.DEVICE_ROLE_TEMPERATURE_SENSOR;
    const isHumiditySensor = deviceRole === constants.DEVICE_ROLE_HUMIDITY_SENSOR;
    const isLightSensor =
      deviceRole === constants.DEVICE_ROLE_LIGHT_SENSOR ||
      deviceRole === constants.DEVICE_ROLE_MULTILEVEL_SENSOR;

    if (isTemperatureSensor) {
      setMain(Service.TemperatureSensor, [Characteristic.CurrentTemperature]);
    } else if (isHumiditySensor) {
      setMain(Service.HumiditySensor, [Characteristic.CurrentRelativeHumidity]);
    } else if (isLightSensor) {
      setMain(Service.LightSensor, [Characteristic.CurrentAmbientLightLevel]);
    } else {
      throw new Error(`Unsupported device role for multilevel sensor: ${deviceRole}`);
    }
  }

  // Motion sensor
  @DeviceType(/^com\.fibaro\.FGMS/)
  @DeviceType('com.fibaro.motionSensor')
  static motionSensor(Service, Characteristic, device, setMain) {
    setMain(Service.MotionSensor, [Characteristic.MotionDetected]);
  }

  // Doorbell / Contact sensor
  @DeviceType(/^com\.fibaro\.FGDW/)
  @DeviceType('com.fibaro.binarySensor')
  @DeviceType('com.fibaro.doorSensor')
  @DeviceType('com.fibaro.windowSensor')
  @DeviceType('com.fibaro.satelZone')
  @DeviceType('com.fibaro.doorWindowSensor')
  static doorbellContactSensor(Service, Characteristic, device, setMain, config) {
    const properties = device.properties || {};
    const { deviceRole } = properties;

    const isMotionSensor = deviceRole === constants.DEVICE_ROLE_MOTION_SENSOR;
    const isPresenceSensor = deviceRole === constants.DEVICE_ROLE_PRESENCE_SENSOR;
    const isDoorbell = device.id === config.doorbellDeviceId;

    if (isMotionSensor) {
      setMain(Service.MotionSensor, [Characteristic.MotionDetected]);
    } else if (isPresenceSensor) {
      setMain(Service.OccupancySensor, [Characteristic.OccupancyDetected]);
    } else if (isDoorbell) {
      setMain(Service.Doorbell, [Characteristic.ProgrammableSwitchEvent]);
    } else {
      setMain(Service.ContactSensor, [Characteristic.ContactSensorState]);
    }
  }

  // Leak sensor
  @DeviceType(/^com\.fibaro\.FGFS/)
  @DeviceType('com.fibaro.floodSensor')
  static leakSensor(Service, Characteristic, device, setMain) {
    setMain(Service.LeakSensor, [Characteristic.LeakDetected]);
  }

  // Smoke sensor
  @DeviceType(/^com\.fibaro\.FGSS/)
  @DeviceType('com.fibaro.smokeSensor')
  @DeviceType('com.fibaro.gasDetector')
  static smokeSensor(Service, Characteristic, device, setMain) {
    setMain(Service.SmokeSensor, [Characteristic.SmokeDetected]);
  }

  // Carbon Monoxide Sensor
  @DeviceType(/^com\.fibaro\.FGCD/)
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

export { autoDeviceConfigs };