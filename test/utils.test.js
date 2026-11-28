const test = require('node:test');
const assert = require('node:assert/strict');

const { Utils } = require('../dist/utils');

test('scale maps and truncates values', () => {
  assert.equal(Utils.scale(50, 0, 100, 0, 180), 90);
  assert.equal(Utils.scale(-45, -45, 45, -90, 90), -90);
  assert.equal(Utils.scale(22.9, 0, 100, 0, 99), 22);
});

test('getBoolean handles booleans, numbers, and strings', () => {
  assert.equal(Utils.getBoolean(true), true);
  assert.equal(Utils.getBoolean(false), false);
  assert.equal(Utils.getBoolean(1), true);
  assert.equal(Utils.getBoolean(0), false);
  assert.equal(Utils.getBoolean(' true '), true);
  assert.equal(Utils.getBoolean('OFF'), false);
  assert.equal(Utils.getBoolean('yes'), true);
  assert.equal(Utils.getBoolean('0'), false);
  assert.equal(Utils.getBoolean('42'), true);
  assert.equal(Utils.getBoolean('12px'), false);
});

test('RGB and HSV conversions support values and object input', () => {
  const hsv = Utils.RGBtoHSV(255, 0, 0, 0);
  assert.deepEqual(hsv, { h: 0, s: 100, v: 100 });

  const objectHsv = Utils.RGBtoHSV({ r: 0, g: 255, b: 0, w: 0 });
  assert.equal(Math.round(objectHsv.h), 120);
  assert.equal(Math.round(objectHsv.s), 100);
  assert.equal(Math.round(objectHsv.v), 100);

  const rgb = Utils.HSVtoRGB(240, 100, 100);
  assert.deepEqual(rgb, { r: 0, g: 0, b: 255, w: 0 });

  const blueHsv = Utils.updateHomeKitColorFromHomeCenter('0,0,255,0');
  assert.equal(Math.round(blueHsv.h), 240);
});
