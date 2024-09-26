// getFunctions.ts

'use strict';

import { SetFunctions } from './setFunctions';

export class GetFunctions {
  getFunctionsMapping;
  getCurrentSecuritySystemStateMapping;
  getTargetSecuritySystemStateMapping;
  platform;

  constructor(platform) {
    this.platform = platform;

    const Characteristic = this.platform.Characteristic;
    this.getFunctionsMapping = new Map([
      [Characteristic.On.UUID, this.getBool],
      [Characteristic.Brightness.UUID, this.getBrightness],
      [Characteristic.PositionState.UUID, this.getPositionState],
      [Characteristic.CurrentPosition.UUID, this.getCurrentPosition],
      [Characteristic.TargetPosition.UUID, this.getCurrentPosition],
      [Characteristic.CurrentHorizontalTiltAngle.UUID, this.getCurrentTiltAngle],
      [Characteristic.TargetHorizontalTiltAngle.UUID, this.getCurrentTiltAngle],
      [Characteristic.MotionDetected.UUID, this.getBool],
      [Characteristic.OccupancyDetected.UUID, this.getBool],
      [Characteristic.CurrentTemperature.UUID, this.getCurrentTemperature || 0],
      [Characteristic.TargetTemperature.UUID, this.getTargetTemperature || 0],
      [Characteristic.CurrentRelativeHumidity.UUID, this.getFloat],
      [Characteristic.ContactSensorState.UUID, this.getContactSensorState],
      [Characteristic.LeakDetected.UUID, this.getLeakDetected],
      [Characteristic.SmokeDetected.UUID, this.getSmokeDetected],
      [Characteristic.CarbonMonoxideDetected.UUID, this.getCarbonMonoxideDetected],
      [Characteristic.CarbonMonoxideLevel.UUID, this.getCarbonMonoxideLevel],
      [Characteristic.CarbonMonoxidePeakLevel.UUID, this.getCarbonMonoxidePeakLevel],
      [Characteristic.CurrentAmbientLightLevel.UUID, this.getFloat],
      [Characteristic.OutletInUse.UUID, this.getOutletInUse],
      [Characteristic.LockCurrentState.UUID, this.getLockCurrentState],
      [Characteristic.LockTargetState.UUID, this.getLockCurrentState],
      [Characteristic.CurrentHeatingCoolingState.UUID, this.getCurrentHeatingCoolingState],
      [Characteristic.TargetHeatingCoolingState.UUID, this.getTargetHeatingCoolingState],
      [Characteristic.TemperatureDisplayUnits.UUID, this.getTemperatureDisplayUnits],
      [Characteristic.Hue.UUID, this.getHue],
      [Characteristic.Saturation.UUID, this.getSaturation],
      [Characteristic.CurrentDoorState.UUID, this.getCurrentDoorState],
      [Characteristic.TargetDoorState.UUID, this.getTargetDoorState],
      [Characteristic.ObstructionDetected.UUID, this.getObstructionDetected],
      [Characteristic.BatteryLevel.UUID, this.getBatteryLevel],
      [Characteristic.ChargingState.UUID, this.getChargingState],
      [Characteristic.StatusLowBattery.UUID, this.getStatusLowBattery],
      [Characteristic.Active.UUID, this.getActive],
      [Characteristic.InUse.UUID, this.getInUse],
      [Characteristic.ProgrammableSwitchEvent.UUID, this.getProgrammableSwitchEvent],
      [Characteristic.AirQuality.UUID, this.getAirQuality],
      [Characteristic.PM2_5Density.UUID, this.getFloat],
    ]);

    this.getCurrentSecuritySystemStateMapping = new Map([
      ['AwayArmed', this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM],
      ['Disarmed', this.platform.Characteristic.SecuritySystemCurrentState.DISARMED],
      ['NightArmed', this.platform.Characteristic.SecuritySystemCurrentState.NIGHT_ARM],
      ['StayArmed', this.platform.Characteristic.SecuritySystemCurrentState.STAY_ARM],
      ['AlarmTriggered', this.platform.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED],
    ]);
    this.getTargetSecuritySystemStateMapping = new Map([
      ['AwayArmed', this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM],
      ['Disarmed', this.platform.Characteristic.SecuritySystemTargetState.DISARM],
      ['NightArmed', this.platform.Characteristic.SecuritySystemTargetState.NIGHT_ARM],
      ['StayArmed', this.platform.Characteristic.SecuritySystemTargetState.STAY_ARM],
    ]);
  }

  // Boolean getter
  getBool(characteristic, service, IDs, properties) {
    const v = properties.value ?? properties['ui.startStopActivitySwitch.value'] ?? false;
    characteristic.updateValue(this.getBoolean(v));
  }

  // Float getter
  getFloat(characteristic, _service, _IDs, properties) {
    const value = properties.value;
    if (value !== undefined && !isNaN(value)) {
      characteristic.updateValue(parseFloat(value));
    }
  }

  getBrightness(characteristic, service, _IDs, { value }) {
    if (isNaN(value)) {
      return;
    }
    let r = Math.min(Math.max(parseFloat(value), 0), 100);

    if (service && !service.isGlobalVariableDimmer && r === 99) {
      r = 100;
    }

    const onCharacteristic = service?.getCharacteristic(this.platform.Characteristic.On);
    if (onCharacteristic?.value === false) {
      return;
    }

    characteristic.updateValue(r);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getPositionState(characteristic, _service, _IDs, _properties) {
    characteristic.updateValue(this.platform.Characteristic.PositionState.STOPPED);
  }

  getCurrentPosition(characteristic, _service, _IDs, properties) {
    const value = properties.value;
    const state = properties.state;
    let position;

    if (value !== undefined && !isNaN(value)) {
      position = Math.min(Math.max(parseInt(value), characteristic.props.minValue), characteristic.props.maxValue);
      position = position === 99 ? 100 : position === 1 ? 0 : position;
    } else {
      position = state === 'Closed' ? 0 : 100;
    }

    characteristic.updateValue(position);
  }

  getCurrentTiltAngle(characteristic, _service, _IDs, properties) {
    const value2 = parseInt(properties.value2 ?? '');
    const angle = (() => {
      if (value2 >= 0 && value2 <= 100) {
        const adjustedValue = value2 === 99 ? 100 : value2 === 1 ? 0 : value2;
        return SetFunctions.scale(adjustedValue, 0, 100, characteristic.props.minValue, characteristic.props.maxValue);
      }
      return characteristic.props.minValue;
    })();

    characteristic.updateValue(angle);
  }

  async getCurrentTemperature(characteristic, service, IDs, properties) {
    try {
      let temperature;

      if (service.isClimateZone || service.isHeatingZone) {
        const zoneType = service.isClimateZone ? 'Climate' : 'Heating';
        const getZoneFunction = service.isClimateZone ?
          this.platform.fibaroClient.getClimateZone :
          this.platform.fibaroClient.getHeatingZone;

        const { body: { properties: zoneProperties } } = await getZoneFunction(IDs[0]);

        const tempProperty = service.isClimateZone ? 'currentTemperatureHeating' : 'currentTemperature';
        temperature = zoneProperties[tempProperty];

        if (temperature === undefined) {
          throw new Error(`No value for Temperature (Current - ${zoneType} zone).`);
        }
      } else {
        temperature = properties.value;
      }

      characteristic.updateValue(temperature);
    } catch (e) {
      this.platform.log(`Error getting Current Temperature: ${service.IDs[0]} - Err: ${e}`);
    }
  }

  async getTargetTemperature(characteristic, service, IDs, properties) {
    try {
      let temperature;

      if (service.isClimateZone || service.isHeatingZone) {
        const zoneType = service.isClimateZone ? 'Climate' : 'Heating';
        const getZoneFunction = service.isClimateZone ?
          this.platform.fibaroClient.getClimateZone :
          this.platform.fibaroClient.getHeatingZone;

        const { body: { properties: zoneProperties } } = await getZoneFunction(IDs[0]);

        const tempProperty = service.isClimateZone ? 'currentTemperatureHeating' : 'currentTemperature';
        temperature = zoneProperties[tempProperty];

        if (temperature === undefined) {
          throw new Error(`No value for Temperature (Target - ${zoneType} zone).`);
        }
      } else {
        temperature = properties.value;
      }

      characteristic.updateValue(temperature);
    } catch (e) {
      this.platform.log(`Error getting Target Temperature: ${service.IDs[0]} - Err: ${e}`);
    }
  }

  getContactSensorState(characteristic, _service, _IDs, properties) {
    const v = this.getBoolean(properties.value);
    characteristic.updateValue(v === false ?
      this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED :
      this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
  }

  getLeakDetected(characteristic, _service, _IDs, properties) {
    const v = this.getBoolean(properties.value);
    characteristic.updateValue(v === true ?
      this.platform.Characteristic.LeakDetected.LEAK_DETECTED :
      this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED);
  }

  getSmokeDetected(characteristic, _service, _IDs, properties) {
    const v = this.getBoolean(properties.value);
    characteristic.updateValue(v === true ?
      this.platform.Characteristic.SmokeDetected.SMOKE_DETECTED :
      this.platform.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
  }

  getCarbonMonoxideDetected(characteristic, _service, _IDs, properties) {
    const v = this.getBoolean(properties.value);
    characteristic.updateValue(v === true ?
      this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL :
      this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL);
  }

  getCarbonMonoxideLevel(characteristic, _service, _IDs, properties) {
    const r = parseFloat(properties.concentration);
    characteristic.updateValue(r);
  }

  getCarbonMonoxidePeakLevel(characteristic, _service, _IDs, properties) {
    const r = parseFloat(properties.maxConcentration);
    characteristic.updateValue(r);
  }

  getOutletInUse(characteristic, _service, _IDs, properties) {
    const power = properties.power;
    if (power !== undefined && !isNaN(power)) {
      characteristic.updateValue(parseFloat(power) > 1.0);
    }
  }

  getLockCurrentState(characteristic, service, _IDs, properties) {
    const v = this.getBoolean(properties.value);
    const { LockCurrentState } = this.platform.Characteristic;

    const state = service.isLockSwitch
      ? (v ? LockCurrentState.UNSECURED : LockCurrentState.SECURED)
      : (v ? LockCurrentState.SECURED : LockCurrentState.UNSECURED);

    characteristic.updateValue(state);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getCurrentHeatingCoolingState(characteristic, service, IDs, _properties) {
    try {
      if (service.isClimateZone) {
        const { body: { properties } } = await this.platform.fibaroClient.getClimateZone(IDs[0]);
        if (!properties.mode) {
          throw new Error('No value for heating cooling state.');
        }

        const { CurrentHeatingCoolingState } = this.platform.Characteristic;
        const modeMap = {
          'Off': CurrentHeatingCoolingState.OFF,
          'Heat': CurrentHeatingCoolingState.HEAT,
          'Cool': CurrentHeatingCoolingState.COOL,
        };

        const state = modeMap[properties.mode];
        if (state !== undefined) {
          characteristic.updateValue(state);
        }
      } else if (service.isHeatingZone) {
        characteristic.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.HEAT);
      }
    } catch (e) {
      this.platform.log(`Error getting Current Heating Cooling State: ${service.IDs[0]} - Err: ${e}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTargetHeatingCoolingState(characteristic, service, IDs, _properties) {
    try {
      if (service.isClimateZone) {
        const { body: { properties } } = await this.platform.fibaroClient.getClimateZone(IDs[0]);
        if (!properties.mode) {
          throw new Error('No value for heating cooling state.');
        }

        const { TargetHeatingCoolingState } = this.platform.Characteristic;
        const modeMap = {
          'Off': TargetHeatingCoolingState.OFF,
          'Heat': TargetHeatingCoolingState.HEAT,
          'Cool': TargetHeatingCoolingState.COOL,
        };

        const state = modeMap[properties.mode];
        if (state !== undefined) {
          characteristic.updateValue(state);
        }
      } else if (service.isHeatingZone) {
        characteristic.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.HEAT);
      }
    } catch (e) {
      this.platform.log(`Error getting Target Heating Cooling State: ${service.IDs[0]} - Err: ${e}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTemperatureDisplayUnits(characteristic, _service, _IDs, _properties) {
    characteristic.updateValue(this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);
  }

  getHue(characteristic, service, _IDs, properties) {
    characteristic.updateValue(Math.round(this.updateHomeKitColorFromHomeCenter(properties.color, service).h));
  }

  getSaturation(characteristic, service, _IDs, properties) {
    characteristic.updateValue(Math.round(this.updateHomeKitColorFromHomeCenter(properties.color, service).s));
  }

  getCurrentDoorState(characteristic, _service, _IDs, properties) {
    const { CurrentDoorState } = this.platform.Characteristic;
    const stateMap = {
      'Opened': CurrentDoorState.OPEN,
      'Opening': CurrentDoorState.OPENING,
      'Closing': CurrentDoorState.CLOSING,
      'Closed': CurrentDoorState.CLOSED,
    };

    const v = parseInt(properties.value);

    if (!isNaN(v)) {
      this.platform.log('getCurrentDoorState value:', v);
      if (v === 0) {
        return characteristic.updateValue(CurrentDoorState.CLOSED);
      }
      if (v === 99) {
        return characteristic.updateValue(CurrentDoorState.OPEN);
      }
      return characteristic.updateValue(CurrentDoorState.STOPPED);
    }

    if (properties.state !== undefined) {
      this.platform.log('getCurrentDoorState:', properties.state);
      const mappedState = stateMap[properties.state];
      if (mappedState !== undefined) {
        return characteristic.updateValue(mappedState);
      }
    }

    characteristic.updateValue(CurrentDoorState.STOPPED);
  }

  getTargetDoorState(characteristic, _service, _IDs, properties) {
    const { TargetDoorState } = this.platform.Characteristic;
    const stateMap = {
      'Opened': TargetDoorState.OPEN,
      'Opening': TargetDoorState.OPEN,
      'Closing': TargetDoorState.CLOSED,
      'Closed': TargetDoorState.CLOSED,
    };

    const v = parseInt(properties.value);

    if (!isNaN(v)) {
      this.platform.log('getTargetDoorState value:', v);
      return characteristic.updateValue(v === 0 ? TargetDoorState.CLOSED : TargetDoorState.OPEN);
    }

    if (properties.state) {
      this.platform.log('getTargetDoorState:', properties.state);
      const mappedState = stateMap[properties.state];
      if (mappedState !== undefined) {
        return characteristic.updateValue(mappedState);
      }
    }

    characteristic.updateValue(TargetDoorState.CLOSED);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getObstructionDetected(characteristic, _service, _IDs, _properties) {
    characteristic.updateValue(0);
  }

  getBatteryLevel(characteristic, _service, _IDs, properties) {
    const batteryLevel = parseFloat(properties.batteryLevel);

    if (isNaN(batteryLevel)) {
      this.platform.log('batteryLevel is not a number.');
      return;
    }

    const level = batteryLevel > 100 ? 0 : batteryLevel;
    characteristic.updateValue(level);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getChargingState(characteristic, _service, _IDs, _properties) {
    characteristic.updateValue(0);
  }

  getStatusLowBattery(characteristic, _service, _IDs, properties) {
    if (isNaN(properties.batteryLevel)) {
      this.platform.log('batteryLevel is not a number.', '');
      return;
    }
    const batteryLevel = parseFloat(properties.batteryLevel);
    const r = (batteryLevel <= 20 || batteryLevel > 100) ? 1 : 0;
    characteristic.updateValue(r);
  }

  getSecuritySystemState(characteristic, _service, _IDs, securitySystemStatus) {
    let r = this.platform.Characteristic.SecuritySystemTargetState.DISARMED;
    if (characteristic.UUID === (new this.platform.Characteristic.SecuritySystemCurrentState()).UUID) {
      r = this.getCurrentSecuritySystemStateMapping.get(securitySystemStatus.value);
    } else if (characteristic.UUID === (new this.platform.Characteristic.SecuritySystemTargetState()).UUID) {
      r = this.getTargetSecuritySystemStateMapping.get(securitySystemStatus.value);
    }
    if (r !== undefined) {
      characteristic.updateValue(r);
    }
  }

  getActive(characteristic, _service, _IDs, properties) {
    const v = this.getBoolean(properties.value);
    characteristic.updateValue(v === false ?
      this.platform.Characteristic.Active.INACTIVE :
      this.platform.Characteristic.Active.ACTIVE);
  }

  getInUse(characteristic, _service, _IDs, properties) {
    const v = this.getBoolean(properties.value);
    characteristic.updateValue(v === false ?
      this.platform.Characteristic.InUse.NOT_IN_USE :
      this.platform.Characteristic.InUse.IN_USE);
  }

  getProgrammableSwitchEvent(characteristic, _service, _IDs, properties) {
    const v = this.getBoolean(properties.value);
    if (v) {
      characteristic.updateValue(this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
    }
  }

  getAirQuality(characteristic, _service, _IDs, properties) {
    const v = parseFloat(properties.value);
    // 2024 AQI for PM 2.5
    // https://www.epa.gov/system/files/documents/2024-02/pm-naaqs-air-quality-index-fact-sheet.pdf
    if (_service.isPM2_5Sensor) {
      if (v <= 5) {
        characteristic.updateValue(this.platform.Characteristic.AirQuality.EXCELLENT);
      } else if (v < 9.1) {
        characteristic.updateValue(this.platform.Characteristic.AirQuality.GOOD);
      } else if ( v < 35.5) {
        characteristic.updateValue(this.platform.Characteristic.AirQuality.FAIR);
      } else if ( v < 55.5) {
        characteristic.updateValue(this.platform.Characteristic.AirQuality.INFERIOR);
      } else {
        characteristic.updateValue(this.platform.Characteristic.AirQuality.POOR);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateHomeKitColorFromHomeCenter(color, _service) {
    const colors = color.split(',');
    const r = parseInt(colors[0]);
    const g = parseInt(colors[1]);
    const b = parseInt(colors[2]);
    const w = parseInt(colors[3]);
    const hsv = this.RGBtoHSV(r, g, b, w);
    return hsv;
  }

  RGBtoHSV(r, g, b, w) {
    if (arguments.length === 1) {
      g = r.g;
      b = r.b;
      r = r.r;
    }
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      d = max - min,
      s = (max === 0 ? 0 : d / max),
      v = Math.max(max, w) / 255;
    let h;

    switch (max) {
      case min: h = 0; break;
      case r: h = (g - b) + d * (g < b ? 6 : 0); h /= 6 * d; break;
      case g: h = (b - r) + d * 2; h /= 6 * d; break;
      case b: h = (r - g) + d * 4; h /= 6 * d; break;
    }

    return {
      h: h * 360.0,
      s: s * 100.0,
      v: v * 100.0,
    };
  }

  getBoolean(value) {
    switch (typeof value) {
      case 'number':
        return value !== 0;
      case 'string': {
        const vNum = parseInt(value);
        if (!isNaN(vNum) && vNum !== 0) {
          return true;
        } else if (!isNaN(vNum) && vNum === 0) {
          return false;
        } else if (value === 'true' || value === 'on' || value === 'yes') {
          return true;
        } else {
          return false;
        }
      }
      case 'boolean':
        return value;
      default:
        return false;
    }
  }
}
