// manualDeviceConfigurations.ts

// Configuration for manual device setup
import { MANUAL_DEVICE_TYPES } from './constants';

type ManualConfigFunction = (Service, Characteristic, device) => {
  service;
  characteristics;
  subtype?: string;
};

const manualDeviceConfigs = new Map<string, ManualConfigFunction>();

// Decorator function for mapping manual device configurations to the device type
function ManualType(displayAs: string) {
  return function(target, propertyKey: string) {
    manualDeviceConfigs.set(displayAs, target[propertyKey]);
  };
}

export class ManualDeviceConfigurations {
  @ManualType(MANUAL_DEVICE_TYPES.SWITCH)
  static configureSwitch(Service, Characteristic) {
    return {
      service: Service.Switch,
      characteristics: [Characteristic.On],
    };
  }

  @ManualType(MANUAL_DEVICE_TYPES.DIMMER)
  static configureDimmer(Service, Characteristic) {
    return {
      service: Service.Lightbulb,
      characteristics: [Characteristic.On, Characteristic.Brightness],
    };
  }

  @ManualType(MANUAL_DEVICE_TYPES.BLIND)
  static configureBlind(Service, Characteristic) {
    return {
      service: Service.WindowCovering,
      characteristics: [
        Characteristic.CurrentPosition,
        Characteristic.TargetPosition,
        Characteristic.PositionState,
        Characteristic.HoldPosition,
      ],
    };
  }

  @ManualType(MANUAL_DEVICE_TYPES.BLIND_WITH_TILT)
  static configureBlindWithTilt(Service, Characteristic) {
    return {
      service: Service.WindowCovering,
      characteristics: [
        Characteristic.CurrentPosition,
        Characteristic.TargetPosition,
        Characteristic.PositionState,
        Characteristic.HoldPosition,
        Characteristic.CurrentHorizontalTiltAngle,
        Characteristic.TargetHorizontalTiltAngle,
      ],
    };
  }

  @ManualType(MANUAL_DEVICE_TYPES.GARAGE)
  static configureGarage(Service, Characteristic) {
    return {
      service: Service.GarageDoorOpener,
      characteristics: [
        Characteristic.CurrentDoorState,
        Characteristic.TargetDoorState,
        Characteristic.ObstructionDetected,
      ],
    };
  }

  @ManualType(MANUAL_DEVICE_TYPES.TEMPERATURE)
  static configureTemperature(Service, Characteristic) {
    return {
      service: Service.TemperatureSensor,
      characteristics: [Characteristic.CurrentTemperature],
    };
  }

  @ManualType(MANUAL_DEVICE_TYPES.HUMIDITY)
  static configureHumidity(Service, Characteristic) {
    return {
      service: Service.HumiditySensor,
      characteristics: [Characteristic.CurrentRelativeHumidity],
    };
  }

  @ManualType(MANUAL_DEVICE_TYPES.LIGHT_SENSOR)
  static configureLightSensor(Service, Characteristic) {
    return {
      service: Service.LightSensor,
      characteristics: [Characteristic.CurrentAmbientLightLevel],
    };
  }

  @ManualType(MANUAL_DEVICE_TYPES.MOTION)
  static configureMotion(Service, Characteristic) {
    return {
      service: Service.MotionSensor,
      characteristics: [Characteristic.MotionDetected],
    };
  }

  @ManualType(MANUAL_DEVICE_TYPES.LEAK)
  static configureLeak(Service, Characteristic) {
    return {
      service: Service.LeakSensor,
      characteristics: [Characteristic.LeakDetected],
    };
  }

  @ManualType(MANUAL_DEVICE_TYPES.SMOKE)
  static configureSmoke(Service, Characteristic) {
    return {
      service: Service.SmokeSensor,
      characteristics: [Characteristic.SmokeDetected],
    };
  }

  @ManualType(MANUAL_DEVICE_TYPES.OUTLET)
  static configureOutlet(Service, Characteristic) {
    return {
      service: Service.Outlet,
      characteristics: [Characteristic.On, Characteristic.OutletInUse],
    };
  }
}

export { manualDeviceConfigs };