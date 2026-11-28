const test = require('node:test');
const assert = require('node:assert/strict');

const { GetFunctions } = require('../dist/getFunctions');

function makeCharacteristic(initialProps = {}) {
  return {
    props: { minValue: -90, maxValue: 90, ...initialProps },
    value: undefined,
    updateValue(value) {
      this.value = value;
    },
  };
}

function makePlatform() {
  const cache = new Map();
  const Characteristic = new Proxy({}, {
    get(target, key) {
      if (key in target) {
        return target[key];
      }
      if (!cache.has(key)) {
        cache.set(key, class {});
      }
      return cache.get(key);
    },
  });
  Characteristic.SecuritySystemCurrentState = {
    AWAY_ARM: 1, DISARMED: 3, NIGHT_ARM: 2, STAY_ARM: 4, ALARM_TRIGGERED: 5,
  };
  Characteristic.SecuritySystemTargetState = {
    AWAY_ARM: 1, DISARM: 3, NIGHT_ARM: 2, STAY_ARM: 4,
  };
  Characteristic.CurrentHeatingCoolingState = { OFF: 0, HEAT: 1, COOL: 2 };
  Characteristic.TargetHeatingCoolingState = { OFF: 0, HEAT: 1, COOL: 2, AUTO: 3 };
  Characteristic.PositionState = { STOPPED: 2 };
  Characteristic.CurrentDoorState = { OPEN: 0, OPENING: 1, CLOSING: 2, CLOSED: 3, STOPPED: 4 };
  Characteristic.TargetDoorState = { OPEN: 0, CLOSED: 1 };
  Characteristic.TemperatureDisplayUnits = { CELSIUS: 0 };
  Characteristic.ContactSensorState = { CONTACT_DETECTED: 0, CONTACT_NOT_DETECTED: 1 };
  Characteristic.LeakDetected = { LEAK_DETECTED: 1, LEAK_NOT_DETECTED: 0 };
  Characteristic.SmokeDetected = { SMOKE_DETECTED: 1, SMOKE_NOT_DETECTED: 0 };
  Characteristic.CarbonMonoxideDetected = { CO_LEVELS_ABNORMAL: 1, CO_LEVELS_NORMAL: 0 };
  Characteristic.LockCurrentState = { UNSECURED: 0, SECURED: 1 };
  Characteristic.Active = { INACTIVE: 0, ACTIVE: 1 };
  Characteristic.InUse = { NOT_IN_USE: 0, IN_USE: 1 };
  Characteristic.ProgrammableSwitchEvent = {
    SINGLE_PRESS: 0, DOUBLE_PRESS: 1, LONG_PRESS: 2,
  };
  Characteristic.AirQuality = {
    EXCELLENT: 1, GOOD: 2, FAIR: 3, INFERIOR: 4, POOR: 5,
  };
  return { Characteristic, log: () => {} };
}

test('GetFunctions maps booleans and HVAC mode switches', () => {
  const platform = makePlatform();
  const functions = new GetFunctions(platform);
  const characteristic = makeCharacteristic();

  functions.getBool(characteristic, {}, [], { value: 'on' });
  assert.equal(characteristic.value, true);

  functions.getBool(characteristic, { hvacModeSwitch: 'Fan' }, [], { thermostatMode: 'Fan' });
  assert.equal(characteristic.value, true);
});

test('GetFunctions clamps and normalizes positions and tilt angles', () => {
  const platform = makePlatform();
  const functions = new GetFunctions(platform);

  const position = makeCharacteristic({ minValue: 0, maxValue: 100 });
  functions.getCurrentPosition(position, {}, [], { value: '150' });
  assert.equal(position.value, 100);

  functions.getCurrentPosition(position, {}, [], { value: '99' });
  assert.equal(position.value, 100);

  const tilt = makeCharacteristic({ minValue: -90, maxValue: 90 });
  functions.getCurrentTiltAngle(tilt, {}, [], { value2: '50' });
  assert.equal(tilt.value, 0);

  functions.getCurrentPosition(position, {}, [], { state: 'Closed' });
  assert.equal(position.value, 0);
  functions.getCurrentTiltAngle(tilt, {}, [], { value2: '101' });
  assert.equal(tilt.value, -90);
});

test('GetFunctions maps sensor states, numeric levels, and battery status', () => {
  const platform = makePlatform();
  const functions = new GetFunctions(platform);
  const characteristic = makeCharacteristic();

  functions.getContactSensorState(characteristic, {}, [], { value: false });
  assert.equal(characteristic.value, 0);
  functions.getLeakDetected(characteristic, {}, [], { value: 'on' });
  assert.equal(characteristic.value, 1);
  functions.getSmokeDetected(characteristic, {}, [], { value: true });
  assert.equal(characteristic.value, 1);
  functions.getCarbonMonoxideDetected(characteristic, {}, [], { value: false });
  assert.equal(characteristic.value, 0);
  functions.getCarbonMonoxideLevel(characteristic, {}, [], { concentration: '12.5' });
  assert.equal(characteristic.value, 12.5);
  functions.getCarbonMonoxidePeakLevel(characteristic, {}, [], { maxConcentration: '20' });
  assert.equal(characteristic.value, 20);
  functions.getOutletInUse(characteristic, {}, [], { power: '1.1' });
  assert.equal(characteristic.value, true);
  functions.getOutletInUse(characteristic, {}, [], { power: 'bad' });
  assert.equal(characteristic.value, true);
  functions.getLockCurrentState(characteristic, { isLockSwitch: false }, [], { value: true });
  assert.equal(characteristic.value, 1);
  functions.getBatteryLevel(characteristic, {}, [], { batteryLevel: '120' });
  assert.equal(characteristic.value, 0);
  functions.getStatusLowBattery(characteristic, {}, [], { batteryLevel: '20' });
  assert.equal(characteristic.value, 1);
  functions.getChargingState(characteristic);
  assert.equal(characteristic.value, 0);
  functions.getInUse(characteristic, {}, [], { value: false });
  assert.equal(characteristic.value, 0);
  functions.getFloat(characteristic, {}, [], { value: '12.75' });
  assert.equal(characteristic.value, 12.75);
});

test('GetFunctions reads and clamps current and target temperatures', async () => {
  const platform = makePlatform();
  const functions = new GetFunctions(platform);
  const characteristic = makeCharacteristic({ minValue: 5, maxValue: 35 });

  await functions.getCurrentTemperature(characteristic, {}, [], { value: '3' });
  assert.equal(characteristic.value, 5);
  await functions.getCurrentTemperature(characteristic, { isHvacCool: true }, [], {
    coolingThermostatSetpoint: '37',
  });
  assert.equal(characteristic.value, 35);
  await functions.getTargetTemperature(characteristic, { isRadiatorThermostaticValve: true }, [], {
    heatingThermostatSetpointFuture: '21.5',
  });
  assert.equal(characteristic.value, 21.5);

  platform.fibaroClient = {
    getClimateZone: async () => ({ body: { properties: { currentTemperatureHeating: 20 } } }),
  };
  await functions.getCurrentTemperature(characteristic, { isClimateZone: true }, ['7'], {});
  assert.equal(characteristic.value, 20);
});

test('GetFunctions maps HVAC states and fan characteristics', async () => {
  const platform = makePlatform();
  platform.Characteristic.Active.INACTIVE = 0;
  platform.Characteristic.Active.ACTIVE = 1;
  platform.Characteristic.InUse.NOT_IN_USE = 0;
  platform.Characteristic.InUse.IN_USE = 1;
  platform.fibaroClient = {
    getClimateZone: async () => ({ body: { properties: { mode: 'Cool' } } }),
  };
  const functions = new GetFunctions(platform);
  const characteristic = makeCharacteristic();

  await functions.getCurrentHeatingCoolingState(characteristic, { isClimateZone: true }, ['1'], {});
  assert.equal(characteristic.value, 2);
  await functions.getCurrentHeatingCoolingState(characteristic, { isHeatingZone: true }, [], {});
  assert.equal(characteristic.value, 1);
  await functions.getCurrentHeatingCoolingState(characteristic, { isHvacHeat: true }, [], {
    thermostatMode: 'Auto',
  });
  assert.equal(characteristic.value, 1);
  await functions.getTargetHeatingCoolingState(characteristic, { isHvacCool: true }, [], {
    thermostatMode: 'Dry',
  });
  assert.equal(characteristic.value, 2);

  functions.getActive(characteristic, { isHvacFanSpeed: true }, [], { thermostatMode: 'Off' });
  assert.equal(characteristic.value, 0);
  functions.getActive(characteristic, {}, [], { value: true });
  assert.equal(characteristic.value, 1);
  functions.getRotationSpeed(characteristic, { isHvacFanSpeed: true }, [], {
    thermostatFanMode: 'AutoHigh',
  });
  assert.equal(characteristic.value, 99.99);
  functions.getRotationSpeed(characteristic, {}, [], { thermostatFanMode: 'Low' });
  functions.getProgrammableSwitchEvent(characteristic, { isRemoteControllerSceneActivation: true }, [], { value: 1 });
  assert.equal(characteristic.value, 0);
  functions.getProgrammableSwitchEvent(characteristic, { isRemoteControllerCentralScene: true }, [], {
    value: 'Pressed2',
  });
  assert.equal(characteristic.value, 1);
  functions.getServiceLabelIndex(characteristic, { remoteButtonNumber: 3 });
  assert.equal(characteristic.value, 3);
});

test('GetFunctions maps door states, security states, and air-quality bands', () => {
  const platform = makePlatform();
  class CurrentSecuritySystemState {}
  class TargetSecuritySystemState {}
  Object.assign(CurrentSecuritySystemState, {
    AWAY_ARM: 1, DISARMED: 3, NIGHT_ARM: 2, STAY_ARM: 4, ALARM_TRIGGERED: 5,
  });
  Object.assign(TargetSecuritySystemState, {
    AWAY_ARM: 1, DISARM: 3, NIGHT_ARM: 2, STAY_ARM: 4,
  });
  platform.Characteristic.SecuritySystemCurrentState = CurrentSecuritySystemState;
  platform.Characteristic.SecuritySystemTargetState = TargetSecuritySystemState;
  const functions = new GetFunctions(platform);
  const characteristic = makeCharacteristic();

  functions.getCurrentDoorState(characteristic, {}, [], { state: 'Opening' });
  assert.equal(characteristic.value, 1);
  functions.getTargetDoorState(characteristic, {}, [], { state: 'Closed' });
  assert.equal(characteristic.value, 1);
  functions.getObstructionDetected(characteristic);
  assert.equal(characteristic.value, 0);

  characteristic.constructor = CurrentSecuritySystemState;
  functions.getSecuritySystemState(characteristic, {}, [], { value: 'AwayArmed' });
  assert.equal(characteristic.value, 1);
  characteristic.constructor = TargetSecuritySystemState;
  functions.getSecuritySystemState(characteristic, {}, [], { value: 'Disarmed' });
  assert.equal(characteristic.value, 3);

  functions.getAirQuality(characteristic, { isPM2_5Sensor: true }, [], { value: '8' });
  assert.equal(characteristic.value, 2);
  functions.getAirQuality(characteristic, { isPM2_5Sensor: true }, [], { value: '40' });
  assert.equal(characteristic.value, 4);
  functions.getAirQuality(characteristic, { isVOCIndexSensor: true }, [], { value: '400' });
  assert.equal(characteristic.value, 5);
});
