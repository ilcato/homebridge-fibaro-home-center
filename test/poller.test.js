const test = require('node:test');
const assert = require('node:assert/strict');

const { Poller } = require('../dist/pollerupdate');

test('poller matches numeric and string device IDs and dispatches color updates', () => {
  let hue;
  let saturation;
  let brightness;
  let onValue;

  class Hue {}
  class Saturation {}
  class Brightness {}
  class On {}
  const characteristic = (constructor, setValue) => ({
    constructor,
    displayName: constructor.name,
    updateValue(value) { setValue(value); },
  });

  const platform = {
    Service: { Battery: class Battery {} },
    Characteristic: { On, Hue, Saturation, Brightness },
    config: { logsLevel: 0, FibaroTemperatureUnit: 'C' },
    updateSubscriptions: [
      { id: '42', property: 'color', characteristic: characteristic(Hue, v => { hue = v; }) },
      { id: '42', property: 'color', characteristic: characteristic(Saturation, v => { saturation = v; }) },
      { id: '42', property: 'color', characteristic: characteristic(Brightness, v => { brightness = v; }) },
      { id: '42', property: 'color', characteristic: characteristic(On, v => { onValue = v; }) },
    ],
  };
  platform.log = { info() {}, debug() {}, error() {} };

  const poller = new Poller(platform, 3);
  poller.manageColor({ id: 42, color: '255,0,0,0' });

  assert.equal(hue, 0);
  assert.equal(saturation, 100);
  assert.equal(brightness, 100);
  assert.equal(onValue, true);
});

test('poller dispatches thermostat mode changes', () => {
  let updated;
  class TargetHeatingCoolingState {}
  const characteristic = {
    constructor: TargetHeatingCoolingState,
    displayName: 'Target Heating Cooling State',
  };
  const getFunction = (_characteristic, _service, _IDs, properties) => {
    updated = properties.thermostatMode;
  };
  const platform = {
    Service: { Battery: class Battery {} },
    Characteristic: { TargetHeatingCoolingState },
    config: { logsLevel: 0 },
    updateSubscriptions: [
      { id: '99', property: 'thermostatMode', characteristic, service: {} },
    ],
    getFunctions: {
      getFunctionsMapping: new Map([[TargetHeatingCoolingState, getFunction]]),
    },
    log: { info() {} },
  };

  const poller = new Poller(platform, 3);
  poller.manageOperatingMode({ id: 99, thermostatMode: 'Cool' });
  assert.equal(updated, 'Cool');
});

test('poller dispatches each change shape and recognized event', () => {
  const platform = {
    Service: { Battery: class Battery {} },
    Characteristic: {},
    config: {},
    updateSubscriptions: [],
    log: { info() {} },
  };
  const poller = new Poller(platform, 3);
  const calls = [];
  poller.manageValue = change => calls.push(['value', change]);
  poller.manageColor = change => calls.push(['color', change]);
  poller.manageOperatingMode = change => calls.push(['mode', change]);
  poller.manageThermostatOperatingState = change => calls.push(['operating', change]);
  poller.manageThermostatFanMode = change => calls.push(['fan', change]);
  poller.manageHeatingThermostatSetpoint = change => calls.push(['heating', change]);
  poller.manageHeatingThermostatSetpointFuture = change => calls.push(['future', change]);
  poller.manageCoolingThermostatSetpoint = change => calls.push(['cooling', change]);

  poller.handleChange({ id: 1, value: true });
  poller.handleChange({ id: 1, 'ui.startStopActivitySwitch.value': false });
  poller.handleChange({ id: 1, color: '0,0,0,0' });
  poller.handleChange({
    id: 1,
    thermostatMode: 'Heat',
    thermostatOperatingState: 'Heating',
    thermostatFanMode: 'Low',
    heatingThermostatSetpoint: 20,
    heatingThermostatSetpointFuture: 21,
    coolingThermostatSetpoint: 18,
  });
  assert.deepEqual(calls.map(([type]) => type), [
    'value', 'value', 'color', 'mode', 'operating', 'fan', 'heating', 'future', 'cooling',
  ]);
  assert.equal(calls[1][1].value, false);

  poller.handleEvent({ type: 'SceneActivationEvent', data: { deviceId: 2, sceneId: 7 } });
  poller.handleEvent({
    type: 'CentralSceneEvent',
    data: { deviceId: 3, keyId: 1, keyAttribute: 'Pressed' },
  });
  poller.handleEvent({ type: 'UnknownEvent', data: {} });
  assert.equal(calls[9][0], 'value');
  assert.deepEqual(calls[9][1], { id: 2, value: 7 });
  assert.deepEqual(calls[10][1], { id: 3, value: 'Pressed', button: 1 });
});

test('poller refreshes and schedules successful polling, then retries errors', async () => {
  const refreshCalls = [];
  const platform = {
    Service: {},
    Characteristic: {},
    config: {
      logsLevel: 2,
      switchglobalvariables: '',
      dimmerglobalvariables: '',
      securitysystem: 'enabled',
    },
    fibaroClient: {
      async refreshStates(last) {
        refreshCalls.push(last);
        if (refreshCalls.length === 2) {
          throw 400;
        }
        return { body: { last: 77, events: [], changes: [] } };
      },
    },
    log: { debug() {}, error() {} },
  };
  const poller = new Poller(platform, 3);
  const restarts = [];
  let securityChecks = 0;
  poller.restartPoll = delay => restarts.push(delay);
  poller.manageSecuritySystem = async () => { securityChecks++; };

  await poller.poll();
  assert.deepEqual(refreshCalls, [0]);
  assert.equal(securityChecks, 1);
  assert.deepEqual(restarts, [3000]);

  await poller.poll();
  assert.deepEqual(refreshCalls, [0, 77]);
  assert.equal(restarts[1], 60000);

  await poller.poll();
  assert.deepEqual(refreshCalls, [0, 77, 0]);
});

test('poller dispatches thermostat properties and skips battery/name subscriptions', () => {
  const seen = [];
  class Battery {}
  class Temp {}
  class Name {}
  const service = { subtype: '12----', remoteButtonNumber: 0 };
  const makeCharacteristic = (constructor, displayName) => ({ constructor, displayName });
  const platform = {
    Service: { Battery },
    Characteristic: { Temp, Name },
    config: { logsLevel: 0, FibaroTemperatureUnit: 'C' },
    updateSubscriptions: [],
    getFunctions: {
      getFunctionsMapping: new Map([[Temp, (_c, _s, _ids, change) => seen.push(change)]]),
    },
    log: { info() {} },
  };
  const addSubscription = (id, property, characteristic, subService = service) => {
    platform.updateSubscriptions.push({
      id, property, characteristic, service: subService,
    });
  };
  const temp = makeCharacteristic(Temp, 'Current Temperature');
  addSubscription('12', 'value', temp);
  addSubscription('12', 'currenttemperature', temp);
  addSubscription('12', 'heatingThermostatSetpoint', temp);
  addSubscription('12', 'targettemperature', temp);
  addSubscription('12', 'coolingThermostatSetpoint', temp);
  addSubscription('12', 'thermostatOperatingState', temp);
  addSubscription('12', 'thermostatFanMode', temp);
  addSubscription('12', 'thermostatMode', temp);
  addSubscription('12', 'value', makeCharacteristic(Name, 'Name'));
  addSubscription('12', 'value', temp, new Battery());

  const poller = new Poller(platform, 3);
  const update = { id: 12, value: 68 };
  poller.manageValue(update);
  assert.equal(seen.length, 1);

  poller.manageOperatingMode({ id: 12, thermostatMode: 'Heat' });
  poller.manageThermostatOperatingState({ id: 12, thermostatOperatingState: 'Heating' });
  poller.manageThermostatFanMode({ id: 12, thermostatFanMode: 'Low' });
  poller.manageHeatingThermostatSetpoint({ id: 12, heatingThermostatSetpoint: 20 });
  poller.manageHeatingThermostatSetpointFuture({ id: 12, heatingThermostatSetpointFuture: 21 });
  poller.manageCoolingThermostatSetpoint({ id: 12, coolingThermostatSetpoint: 19 });
  assert.equal(seen.length, 8);
});

test('poller cancellation prevents processing a fetched response', async () => {
  let restarts = 0;
  const platform = {
    Service: {},
    Characteristic: {},
    config: { logsLevel: 0 },
    fibaroClient: {
      async refreshStates() {
        return { body: { last: 1, events: [{ type: 'Unknown', data: {} }], changes: [] } };
      },
    },
    log: { error() {} },
  };
  const poller = new Poller(platform, 3);
  poller.restartPoll = () => { restarts++; };
  poller.cancelPoll();
  await poller.poll();
  assert.equal(restarts, 0);
});
