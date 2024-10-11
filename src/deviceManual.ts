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
  static configureSwitch(Service, Characteristic, device) {
    return [{
      service: Service.Switch,
      characteristics: [Characteristic.On],
      subtype: device.id + '----',
    }];
  }

  @ManualType(MANUAL_DEVICE_TYPES.DIMMER)
  static configureDimmer(Service, Characteristic, device) {
    return [{
      service: Service.Lightbulb,
      characteristics: [Characteristic.On, Characteristic.Brightness],
      subtype: device.id + '----',
    }];
  }

  @ManualType(MANUAL_DEVICE_TYPES.BLIND)
  static configureBlind(Service, Characteristic, device) {
    return [{
      service: Service.WindowCovering,
      characteristics: [
        Characteristic.CurrentPosition,
        Characteristic.TargetPosition,
        Characteristic.PositionState,
        Characteristic.HoldPosition,
      ],
      subtype: device.id + '----',
    }];
  }

  @ManualType(MANUAL_DEVICE_TYPES.BLIND_WITH_TILT)
  static configureBlindWithTilt(Service, Characteristic, device) {
    return [{
      service: Service.WindowCovering,
      characteristics: [
        Characteristic.CurrentPosition,
        Characteristic.TargetPosition,
        Characteristic.PositionState,
        Characteristic.HoldPosition,
        Characteristic.CurrentHorizontalTiltAngle,
        Characteristic.TargetHorizontalTiltAngle,
      ],
      subtype: device.id + '----',
    }];
  }

  @ManualType(MANUAL_DEVICE_TYPES.GARAGE)
  static configureGarage(Service, Characteristic, device) {
    return [{
      service: Service.GarageDoorOpener,
      characteristics: [
        Characteristic.CurrentDoorState,
        Characteristic.TargetDoorState,
        Characteristic.ObstructionDetected,
      ],
      subtype: device.id + '----',
    }];
  }

  @ManualType(MANUAL_DEVICE_TYPES.TEMPERATURE)
  static configureTemperature(Service, Characteristic, device) {
    return [{
      service: Service.TemperatureSensor,
      characteristics: [Characteristic.CurrentTemperature],
      subtype: device.id + '----',
    }];
  }

  @ManualType(MANUAL_DEVICE_TYPES.HUMIDITY)
  static configureHumidity(Service, Characteristic, device) {
    return [{
      service: Service.HumiditySensor,
      characteristics: [Characteristic.CurrentRelativeHumidity],
      subtype: device.id + '----',
    }];
  }

  @ManualType(MANUAL_DEVICE_TYPES.LIGHT_SENSOR)
  static configureLightSensor(Service, Characteristic, device) {
    return [{
      service: Service.LightSensor,
      characteristics: [Characteristic.CurrentAmbientLightLevel],
      subtype: device.id + '----',
    }];
  }

  @ManualType(MANUAL_DEVICE_TYPES.MOTION)
  static configureMotion(Service, Characteristic, device) {
    return [{
      service: Service.MotionSensor,
      characteristics: [Characteristic.MotionDetected],
      subtype: device.id + '----',
    }];
  }

  @ManualType(MANUAL_DEVICE_TYPES.LEAK)
  static configureLeak(Service, Characteristic, device) {
    return [{
      service: Service.LeakSensor,
      characteristics: [Characteristic.LeakDetected],
      subtype: device.id + '----',
    }];
  }

  @ManualType(MANUAL_DEVICE_TYPES.SMOKE)
  static configureSmoke(Service, Characteristic, device) {
    return [{
      service: Service.SmokeSensor,
      characteristics: [Characteristic.SmokeDetected],
      subtype: device.id + '----',
    }];
  }

  @ManualType(MANUAL_DEVICE_TYPES.OUTLET)
  static configureOutlet(Service, Characteristic, device) {
    return [{
      service: Service.Outlet,
      characteristics: [Characteristic.On, Characteristic.OutletInUse],
      subtype: device.id + '----',
    }];
  }
}

export { manualDeviceConfigs };