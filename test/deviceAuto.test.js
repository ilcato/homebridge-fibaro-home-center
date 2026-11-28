const test = require('node:test');
const assert = require('node:assert/strict');

const { autoDeviceConfigs } = require('../dist/deviceAuto');
const constants = require('../dist/constants');

function findConfig(type) {
  for (const [matcher, config] of autoDeviceConfigs) {
    if (typeof matcher === 'string' ? matcher === type : matcher.test(type)) {
      return config;
    }
  }
  return undefined;
}

function fakeServiceNames() {
  return {
    Lightbulb: 'Lightbulb',
    Switch: 'Switch',
    Outlet: 'Outlet',
    Valve: 'Valve',
    GarageDoorOpener: 'GarageDoorOpener',
    WindowCovering: 'WindowCovering',
    LockMechanism: 'LockMechanism',
    Thermostat: 'Thermostat',
    Fanv2: 'Fanv2',
    TemperatureSensor: 'TemperatureSensor',
    HumiditySensor: 'HumiditySensor',
    LightSensor: 'LightSensor',
    MotionSensor: 'MotionSensor',
    OccupancySensor: 'OccupancySensor',
    Doorbell: 'Doorbell',
    ContactSensor: 'ContactSensor',
    LeakSensor: 'LeakSensor',
    SmokeSensor: 'SmokeSensor',
    CarbonMonoxideSensor: 'CarbonMonoxideSensor',
    StatelessProgrammableSwitch: 'StatelessProgrammableSwitch',
    SecuritySystem: 'SecuritySystem',
  };
}

const Characteristic = {
  On: 'On',
  Brightness: 'Brightness',
  Hue: 'Hue',
  Saturation: 'Saturation',
  LockCurrentState: 'LockCurrentState',
  LockTargetState: 'LockTargetState',
  Active: 'Active',
  InUse: 'InUse',
  ValveType: 'ValveType',
  CurrentDoorState: 'CurrentDoorState',
  TargetDoorState: 'TargetDoorState',
  ObstructionDetected: 'ObstructionDetected',
  CurrentPosition: 'CurrentPosition',
  TargetPosition: 'TargetPosition',
  PositionState: 'PositionState',
  HoldPosition: 'HoldPosition',
  CurrentHorizontalTiltAngle: 'CurrentHorizontalTiltAngle',
  TargetHorizontalTiltAngle: 'TargetHorizontalTiltAngle',
  CurrentTemperature: 'CurrentTemperature',
  TargetTemperature: 'TargetTemperature',
  CurrentHeatingCoolingState: 'CurrentHeatingCoolingState',
  TargetHeatingCoolingState: 'TargetHeatingCoolingState',
  TemperatureDisplayUnits: 'TemperatureDisplayUnits',
  RotationSpeed: 'RotationSpeed',
  CurrentRelativeHumidity: 'CurrentRelativeHumidity',
  CurrentAmbientLightLevel: 'CurrentAmbientLightLevel',
  MotionDetected: 'MotionDetected',
  OccupancyDetected: 'OccupancyDetected',
  ProgrammableSwitchEvent: 'ProgrammableSwitchEvent',
  ContactSensorState: 'ContactSensorState',
  LeakDetected: 'LeakDetected',
  SmokeDetected: 'SmokeDetected',
  CarbonMonoxideDetected: 'CarbonMonoxideDetected',
  CarbonMonoxideLevel: 'CarbonMonoxideLevel',
  CarbonMonoxidePeakLevel: 'CarbonMonoxidePeakLevel',
  BatteryLevel: 'BatteryLevel',
  ServiceLabelIndex: 'ServiceLabelIndex',
  SecuritySystemCurrentState: 'SecuritySystemCurrentState',
  SecuritySystemTargetState: 'SecuritySystemTargetState',
};

test('light configuration distinguishes dimmers from switches', () => {
  const config = findConfig('com.fibaro.multilevelSwitch');
  assert.ok(config);

  const dimmer = config(fakeServiceNames(), Characteristic, {
    id: 10,
    properties: { deviceControlType: constants.CONTROL_TYPE_LIGHTING },
  });
  assert.equal(dimmer[0].service, 'Lightbulb');
  assert.deepEqual(dimmer[0].characteristics, ['On', 'Brightness']);

  const switchConfig = config(fakeServiceNames(), Characteristic, {
    id: 11,
    properties: { deviceControlType: '1' },
  });
  assert.equal(switchConfig[0].service, 'Switch');
  assert.deepEqual(switchConfig[0].characteristics, ['On']);
});

test('various switches select lock, valve, and outlet services', () => {
  const config = findConfig('com.fibaro.binarySwitch');
  assert.ok(config);

  const lock = config(fakeServiceNames(), Characteristic, {
    id: 20,
    properties: { deviceControlType: String(constants.CONTROL_TYPE_VIDEO_INTERCOM) },
  });
  assert.equal(lock[0].service, 'LockMechanism');
  assert.equal(lock[0].subtype, '20--LOCK');

  const valve = config(fakeServiceNames(), Characteristic, {
    id: 21,
    properties: { deviceControlType: constants.CONTROL_TYPE_SPRINKLER },
  });
  assert.equal(valve[0].service, 'Valve');

  const outlet = config(fakeServiceNames(), Characteristic, {
    id: 22,
    properties: { deviceControlType: 999 },
  });
  assert.equal(outlet[0].service, 'Outlet');
});

test('garage and positioning devices get the correct coverage service', () => {
  const config = findConfig('com.fibaro.rollerShutter');
  assert.ok(config);

  const garage = config(fakeServiceNames(), Characteristic, {
    id: 30,
    type: 'com.fibaro.rollerShutter',
    properties: { deviceControlType: constants.CONTROL_TYPE_GARAGE_DOOR },
  });
  assert.equal(garage[0].service, 'GarageDoorOpener');

  const blind = config(fakeServiceNames(), Characteristic, {
    id: 31,
    type: 'com.fibaro.rollerShutter',
    properties: { deviceControlType: constants.CONTROL_TYPE_BLINDS_WITH_POSITIONING },
  });
  assert.equal(blind[0].service, 'WindowCovering');
});

test('sensor and contact-device configurations follow device roles', () => {
  const service = fakeServiceNames();
  const multilevel = findConfig('com.fibaro.multilevelSensor');
  const roles = [
    [constants.DEVICE_ROLE_TEMPERATURE_SENSOR, 'TemperatureSensor'],
    [constants.DEVICE_ROLE_HUMIDITY_SENSOR, 'HumiditySensor'],
    [constants.DEVICE_ROLE_LIGHT_SENSOR, 'LightSensor'],
    [constants.DEVICE_ROLE_MULTILEVEL_SENSOR, 'LightSensor'],
  ];
  for (const [deviceRole, expectedService] of roles) {
    const config = multilevel(service, Characteristic, {
      id: 40, type: 'com.fibaro.multilevelSensor', properties: { deviceRole },
    });
    assert.equal(config[0].service, expectedService);
  }
  const unsupportedRole = multilevel(service, Characteristic, {
    id: 41, type: 'com.fibaro.multilevelSensor', properties: { deviceRole: 'Unknown' },
  }, {}, { debug() {} });
  assert.equal(unsupportedRole, undefined);

  const contact = findConfig('com.fibaro.doorWindowSensor');
  assert.equal(contact(service, Characteristic, {
    id: 42, properties: { deviceRole: constants.DEVICE_ROLE_MOTION_SENSOR },
  }, {}).at(0).service, 'MotionSensor');
  assert.equal(contact(service, Characteristic, {
    id: 43, properties: { deviceRole: constants.DEVICE_ROLE_PRESENCE_SENSOR },
  }, {}).at(0).service, 'OccupancySensor');
  assert.equal(contact(service, Characteristic, { id: 44, properties: {} }, {
    doorbellDeviceId: 44,
  }).at(0).service, 'Doorbell');
  assert.equal(contact(service, Characteristic, { id: 45, properties: {} }, {}).at(0).service, 'ContactSensor');

  assert.equal(findConfig('com.fibaro.temperatureSensor')(service, Characteristic, { id: 46 })[0].service, 'TemperatureSensor');
  assert.equal(findConfig('com.fibaro.humiditySensor')(service, Characteristic, { id: 47 })[0].service, 'HumiditySensor');
  assert.equal(findConfig('com.fibaro.lightSensor')(service, Characteristic, { id: 48 })[0].service, 'LightSensor');
  assert.equal(findConfig('com.fibaro.motionSensor')(service, Characteristic, { id: 49 })[0].service, 'MotionSensor');
  assert.equal(findConfig('com.fibaro.floodSensor')(service, Characteristic, { id: 50 })[0].service, 'LeakSensor');
  assert.equal(findConfig('com.fibaro.smokeSensor')(service, Characteristic, { id: 51 })[0].service, 'SmokeSensor');
  assert.equal(findConfig('com.fibaro.FGCD001')(service, Characteristic, { id: 52 })[0].service, 'CarbonMonoxideSensor');
});

test('remote controllers and HVAC devices configure their accessory services', () => {
  const service = fakeServiceNames();
  const remote = findConfig('com.fibaro.remoteController');
  const scenes = remote(service, Characteristic, {
    id: 60,
    properties: { availableScenes: '[1,2,3]', centralSceneSupport: [] },
  });
  assert.equal(scenes.length, 2);
  assert.equal(scenes[0].subtype, '60---SA-1');

  const central = remote(service, Characteristic, {
    id: 61,
    properties: { availableScenes: 'bad json', centralSceneSupport: '[{"keyId":2}]' },
  });
  assert.equal(central[0].subtype, '61---CS-2');
  assert.equal(remote(service, Characteristic, {
    id: 62, properties: { availableScenes: [], centralSceneSupport: [] },
  }), undefined);

  const hvac = findConfig('com.fibaro.hvacSystemHeat')(service, Characteristic, {
    id: 63,
    properties: {
      supportedThermostatFanModes: ['Low'],
      supportedThermostatModes: ['Dry', 'Fan'],
    },
  });
  assert.deepEqual(hvac.map(item => item.service), ['Thermostat', 'Fanv2', 'Switch', 'Switch']);
  assert.equal(hvac[2].subtype, '63--HVAC_DRY');
  assert.equal(findConfig('com.fibaro.hvacSystemCool')(service, Characteristic, {
    id: 64, properties: {},
  })[0].subtype, '64--HVAC_COOL');
});

test('manual controller, zone, and global-variable configurations map subtypes', () => {
  const service = fakeServiceNames();
  const types = [
    ['com.fibaro.doorLock', 'LockMechanism', '65----', 65],
    ['securitySystem', 'SecuritySystem', '0--', 0],
    ['scene', 'Switch', '66--SC', 66],
    ['climateZone', 'Thermostat', '67--CZ', 67],
    ['heatingZone', 'Thermostat', '68--HZ', 68],
    ['G', 'Switch', 'G-Guest-', 'G'],
    ['D', 'Lightbulb', 'D-Dimmer-', 'D'],
  ];
  for (const [type, expectedService, expectedSubtype, id] of types) {
    const config = findConfig(type)(service, Characteristic, {
      id,
      type,
      name: type === 'G' ? 'Guest' : 'Dimmer',
    });
    assert.equal(config[0].service, expectedService);
    assert.equal(config[0].subtype, expectedSubtype);
  }
  assert.equal(findConfig('com.fibaro.FGWD111')(service, Characteristic, {
    id: 69, properties: { deviceControlType: constants.CONTROL_TYPE_LIGHTING_ALT },
  })[0].service, 'Lightbulb');
});
