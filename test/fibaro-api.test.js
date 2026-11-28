const test = require('node:test');
const assert = require('node:assert/strict');

const { FibaroClient } = require('../dist/fibaro-api');

test('FibaroClient composes URLs and sends device actions', async () => {
  const client = new FibaroClient('http://home-center.local', 'admin', 'secret', () => {});
  const calls = [];
  client.genericPost = async (service, body) => {
    calls.push({ service, body });
    return { body: { result: true } };
  };

  const result = await client.executeDeviceAction(12, 'setValue', [50]);
  assert.equal(result.body.result, true);
  assert.deepEqual(calls[0], {
    service: '/api/devices/12/action/setValue',
    body: { args: [50] },
  });

  await client.executeDeviceAction(12, 'turnOn', null);
  assert.deepEqual(calls[1].body, {});
});

test('FibaroClient builds climate and global variable bodies', async () => {
  const client = new FibaroClient('http://home-center.local', 'admin', 'secret', () => {});
  const puts = [];
  client.genericPut = async (service, body) => {
    puts.push({ service, body });
  };
  client.genericAdminPut = async (service, body) => {
    puts.push({ service, body });
  };

  await client.setClimateZoneHandTemperature(7, 'Heat', 21.5, 123456);
  assert.deepEqual(puts[0], {
    service: '/api/panels/climate/7',
    body: {
      properties: {
        handMode: 'Heat',
        handTimestamp: 123456,
        handSetPointHeating: 21.5,
      },
    },
  });

  await client.setHeatingZoneHandTemperature(8, 19, 123456);
  assert.equal(puts[1].service, '/api/panels/heating/8');
  assert.deepEqual(puts[1].body.properties, {
    handTemperature: 19,
    handTimestamp: 123456,
  });

  await client.setGlobalVariable('GuestMode', 'true');
  assert.deepEqual(puts[2].body, { value: 'true', invokeScenes: true });

  await client.setClimateZoneHandTemperature(7, 'Cool', 19, 123457);
  assert.deepEqual(puts[3].body.properties, {
    handMode: 'Cool',
    handTimestamp: 123457,
    handSetPointCooling: 19,
  });
  await client.setClimateZoneHandTemperature(7, 'Off', 19, 123458);
  assert.deepEqual(puts[4].body.properties, { handMode: 'Off', handTimestamp: 123458 });
  await client.setGlobalVariable('GuestMode', null);
  assert.equal(puts[5].body, null);
});

test('FibaroClient routes read endpoints and scene API versions', async () => {
  const client = new FibaroClient('http://home-center.local', 'admin', 'secret', () => {});
  const gets = [];
  const posts = [];
  client.genericGet = async service => {
    gets.push(service);
    return { body: {} };
  };
  client.genericPost = async (service, body) => {
    posts.push({ service, body });
    return { body: {} };
  };

  await client.getInfo();
  await client.getScenes();
  await client.getClimateZones();
  await client.getClimateZone(3);
  await client.getHeatingZones();
  await client.getHeatingZone(4);
  await client.getRooms();
  await client.getDevices();
  await client.getDeviceProperties(5);
  await client.refreshStates(123);
  await client.getGlobalVariable('Mode');
  assert.deepEqual(gets, [
    '/api/settings/info',
    '/api/scenes',
    '/api/panels/climate?detailed=false',
    '/api/panels/climate/3',
    '/api/panels/heating',
    '/api/panels/heating/4',
    '/api/rooms',
    '/api/devices',
    '/api/devices/5',
    '/api/refreshStates?last=123',
    '/api/globalVariables/Mode',
  ]);

  await client.executeScene(9, true);
  await client.executeScene(10, false);
  assert.deepEqual(posts, [
    { service: '/api/scenes/9/action/start', body: {} },
    { service: '/api/scenes/10/execute', body: {} },
  ]);
});
