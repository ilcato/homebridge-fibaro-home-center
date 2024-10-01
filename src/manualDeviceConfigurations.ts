// manualDeviceConfigurations.ts

// Configuration for manual device setup
import { MANUAL_DEVICE_TYPES } from './constants';

const manualDeviceConfigs = new Map<string, (Service, Characteristic, device, setMain) => void>();

function ManualType(displayAs: string) {
  return function(target, propertyKey: string) {
    manualDeviceConfigs.set(displayAs, target[propertyKey]);
  };
}

export class ManualDeviceConfigurations {
  @ManualType(MANUAL_DEVICE_TYPES.SWITCH)
  static configureSwitch(Service, Characteristic, device, setMain) {
    setMain(Service.Switch, [Characteristic.On]);
  }

  @ManualType(MANUAL_DEVICE_TYPES.DIMMER)
  static configureDimmer(Service, Characteristic, device, setMain) {
    setMain(Service.Lightbulb, [Characteristic.On, Characteristic.Brightness]);
  }

  @ManualType(MANUAL_DEVICE_TYPES.BLIND)
  static configureBlind(Service, Characteristic, device, setMain) {
    setMain(Service.WindowCovering, [
      Characteristic.CurrentPosition,
      Characteristic.TargetPosition,
      Characteristic.PositionState,
      Characteristic.HoldPosition,
    ]);
  }

  @ManualType(MANUAL_DEVICE_TYPES.BLIND_WITH_TILT)
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

  @ManualType(MANUAL_DEVICE_TYPES.GARAGE)
  static configureGarage(Service, Characteristic, device, setMain) {
    setMain(Service.GarageDoorOpener, [
      Characteristic.CurrentDoorState,
      Characteristic.TargetDoorState,
      Characteristic.ObstructionDetected,
    ]);
  }

  @ManualType(MANUAL_DEVICE_TYPES.TEMPERATURE)
  static configureTemperature(Service, Characteristic, device, setMain) {
    setMain(Service.TemperatureSensor, [Characteristic.CurrentTemperature]);
  }

  @ManualType(MANUAL_DEVICE_TYPES.HUMIDITY)
  static configureHumidity(Service, Characteristic, device, setMain) {
    setMain(Service.HumiditySensor, [Characteristic.CurrentRelativeHumidity]);
  }

  @ManualType(MANUAL_DEVICE_TYPES.LIGHT_SENSOR)
  static configureLightSensor(Service, Characteristic, device, setMain) {
    setMain(Service.LightSensor, [Characteristic.CurrentAmbientLightLevel]);
  }

  @ManualType(MANUAL_DEVICE_TYPES.MOTION)
  static configureMotion(Service, Characteristic, device, setMain) {
    setMain(Service.MotionSensor, [Characteristic.MotionDetected]);
  }

  @ManualType(MANUAL_DEVICE_TYPES.LEAK)
  static configureLeak(Service, Characteristic, device, setMain) {
    setMain(Service.LeakSensor, [Characteristic.LeakDetected]);
  }

  @ManualType(MANUAL_DEVICE_TYPES.SMOKE)
  static configureSmoke(Service, Characteristic, device, setMain) {
    setMain(Service.SmokeSensor, [Characteristic.SmokeDetected]);
  }
}

export { manualDeviceConfigs };