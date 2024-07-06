//    Copyright 2023 ilcato
//
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

// Fibaro Home Center Platform plugin for HomeBridge

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
    let v = properties.value;
    if (v !== undefined) {
      v = this.getBoolean(v);
    } else {
      v = properties['ui.startStopActivitySwitch.value'];
      if (v === undefined) {
        v = false;
      }
    }
    characteristic.updateValue(v);
  }

  // Float getter
  getFloat(characteristic, _service, _IDs, properties) {
    if (isNaN(properties.value)) {
      return;
    }
    const r = parseFloat(properties.value);
    characteristic.updateValue(r);
  }

  getBrightness(characteristic, service, _IDs, properties) {
    if (isNaN(properties.value)) {
      return;
    }
    let r = parseFloat(properties.value);
    if (r > 100) {
      r = 100;
    }
    if (r < 0) {
      r = 0;
    }
    if (service !== null && !service.isGlobalVariableDimmer) { // For real dimmers
      if (r === 99) {
        r = 100;
      }
    }
    // If "On" charatecreristic is false, brightness update is skipped
    if (service) {
      const onCharacteristic = service.getCharacteristic(this.platform.Characteristic.On);
      if (onCharacteristic && onCharacteristic.value === false) {
        return;
      }
    }
    characteristic.updateValue(r);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getPositionState(characteristic, _service, _IDs, _properties) {
    characteristic.updateValue(this.platform.Characteristic.PositionState.STOPPED);
  }

  getCurrentPosition(characteristic, _service, _IDs, properties) {
    let r = 0;

    if (isNaN(properties.value)) {
      if (properties.state === 'Closed') {
        r = 0;
      } else {
        r = 100;
      }
    } else {
      r = parseInt(properties.value);
      if (r >= characteristic.props.minValue && r <= characteristic.props.maxValue) {
        if (r === 99) {
          r = 100;
        } else if (r === 1) {
          r = 0;
        }
      } else {
        r = characteristic.props.minValue;
      }
    }
    characteristic.updateValue(r);
  }

  getCurrentTiltAngle(characteristic, _service, _IDs, properties) {
    let value2 = parseInt(properties.value2);
    if (value2 >= 0 && value2 <= 100) {
      if (value2 === 99) {
        value2 = 100;
      } else if (value2 === 1) {
        value2 = 0;
      }
    } else {
      value2 = characteristic.props.minValue;
    }
    const angle = SetFunctions.scale(value2, 0, 100, characteristic.props.minValue, characteristic.props.maxValue);
    characteristic.updateValue(angle);
  }

  async getCurrentTemperature(characteristic, service, IDs, properties) {
    if (service.isClimateZone) { // used in new API (not in HC2 and HCL)
      try {
        const properties = (await this.platform.fibaroClient.getClimateZone(IDs[0])).body.properties;
        if (!Object.prototype.hasOwnProperty.call(properties, 'currentTemperatureHeating')) {
          this.platform.log('No value for Temperature (Current - Climate zone).', '');
          return;
        }
        characteristic.updateValue(properties.currentTemperatureHeating);
      } catch (e) {
        this.platform.log('Error getting Current Temperature Climate Zone: ', `${service.IDs[0]} - Err: ${e}`);
        return;
      }
    } else if (service.isHeatingZone) { // used in old API (HC2 and HCL)
      try {
        const properties = (await this.platform.fibaroClient.getHeatingZone(IDs[0])).body.properties;
        if (!Object.prototype.hasOwnProperty.call(properties, 'currentTemperature')) {
          this.platform.log('No value for Temperature (Current - Heating zone).', '');
          return;
        }
        characteristic.updateValue(properties.currentTemperature);
      } catch (e) {
        this.platform.log('Error getting Current Temperature Heating Zone: ', `${service.IDs[0]} - Err: ${e}`);
        return;
      }
    } else {
      const value = properties.value;
      characteristic.updateValue(value);
    }
  }

  async getTargetTemperature(characteristic, service, IDs, properties) {
    if (service.isClimateZone) {
      try {
        const properties = (await this.platform.fibaroClient.getClimateZone(IDs[0])).body.properties;
        if (!properties.currentTemperatureHeating) {
          this.platform.log('No value for Temperature (Target - Climate zone).', '');
          return;
        }
        characteristic.updateValue(properties.currentTemperatureHeating);
      } catch (e) {
        this.platform.log('Error getting Target Temperature Climate Zone: ', `${service.IDs[0]} - Err: ${e}`);
        return;
      }
    } else if (service.isHeatingZone) {
      try {
        const properties = (await this.platform.fibaroClient.getHeatingZone(IDs[0])).body.properties;
        if (!Object.prototype.hasOwnProperty.call(properties, 'currentTemperature')) {
          this.platform.log('No value for Temperature (Target - Heating zone).', '');
          return;
        }
        characteristic.updateValue(properties.currentTemperature);
      } catch (e) {
        this.platform.log('Error getting Target Temperature Heating Zone: ', `${service.IDs[0]} - Err: ${e}`);
        return;
      }
    } else {
      const value = properties.value;
      characteristic.updateValue(value);
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
    if (isNaN(properties.power)) {
      this.platform.log('power is not a number.', '');
      return;
    }
    characteristic.updateValue(parseFloat(properties.power) > 1.0 ? true : false);
  }

  getLockCurrentState(characteristic, service, _IDs, properties) {
    const v = this.getBoolean(properties.value);
    if (service.isLockSwitch) {
      characteristic.updateValue(v === false ?
        this.platform.Characteristic.LockCurrentState.SECURED :
        this.platform.Characteristic.LockCurrentState.UNSECURED);
      return;
    }
    characteristic.updateValue(v === true ?
      this.platform.Characteristic.LockCurrentState.SECURED :
      this.platform.Characteristic.LockCurrentState.UNSECURED);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getCurrentHeatingCoolingState(characteristic, service, IDs, _properties) {
    if (service.isClimateZone) {
      try {
        const properties = (await this.platform.fibaroClient.getClimateZone(IDs[0])).body.properties;
        if (!properties.mode) {
          this.platform.log('No value for heating cooling steate.', '');
          return;
        }
        switch (properties.mode) {
          case 'Off': // OFF
            characteristic.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.OFF);
            break;
          case 'Heat': // HEAT
            characteristic.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.HEAT);
            break;
          case 'Cool': // COOL
            characteristic.updateValue(this.platform.Characteristic.CurrentHeatingCoolingState.COOL);
            break;
          default:
            break;
        }
      } catch (e) {
        this.platform.log('There was a problem getting value from: ', `${service.IDs[0]} - Err: ${e}`);
        return;
      }
    } else if (service.isHeatingZone) {
      characteristic.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.HEAT);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTargetHeatingCoolingState(characteristic, service, IDs, _properties) {
    if (service.isClimateZone) {
      try {
        const properties = (await this.platform.fibaroClient.getClimateZone(IDs[0])).body.properties;
        if (!properties.mode) {
          this.platform.log('No value for heating cooling steate.', '');
          return;
        }
        switch (properties.mode) {
          case 'Off': // OFF
            characteristic.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.OFF);
            break;
          case 'Heat': // HEAT
            characteristic.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.HEAT);
            break;
          case 'Cool': // COOL
            characteristic.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.COOL);
            break;
          default:
            break;
        }
      } catch (e) {
        this.platform.log('There was a problem getting value from: ', `${service.IDs[0]} - Err: ${e}`);
        return;
      }
    } else if (service.isHeatingZone) {
      characteristic.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.HEAT);
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
    const v = parseInt(properties.value);
    if (!isNaN(v)) {
      this.platform.log('getCurrentDoorState value:', v);
    } else if (properties.state !== undefined) {
      this.platform.log('getCurrentDoorState:', properties.state);
    }
    switch (properties.state) {
      case 'Opened':
        characteristic.updateValue(this.platform.Characteristic.CurrentDoorState.OPEN);
        break;
      case 'Opening':
        characteristic.updateValue(this.platform.Characteristic.CurrentDoorState.CLOSED);
        break;
      case 'Closing':
        characteristic.updateValue(this.platform.Characteristic.CurrentDoorState.OPEN);
        break;
      case 'Closed':
        characteristic.updateValue(this.platform.Characteristic.CurrentDoorState.CLOSED);
        break;
      case 'Unknown':
      case undefined:
        if (v === 0) {
          characteristic.updateValue(this.platform.Characteristic.CurrentDoorState.CLOSED);
        } else if (v === 99) {
          characteristic.updateValue(this.platform.Characteristic.CurrentDoorState.OPEN);
        } else {
          characteristic.updateValue(this.platform.Characteristic.CurrentDoorState.STOPPED);
        }
        break;
      default:
        characteristic.updateValue(this.platform.Characteristic.CurrentDoorState.STOPPED);
        break;
    }
  }

  getTargetDoorState(characteristic, _service, _IDs, properties) {
    const v = parseInt(properties.value);
    if (!isNaN(v)) {
      this.platform.log('getTargetDoorState value:', v);
    } else if (properties.state !== undefined) {
      this.platform.log('getTargetDoorState:', properties.state);
    }
    switch (properties.state) {
      case 'Opened':
        characteristic.updateValue(this.platform.Characteristic.CurrentDoorState.OPEN);
        break;
      case 'Opening':
        characteristic.updateValue(this.platform.Characteristic.CurrentDoorState.OPEN);
        break;
      case 'Closing':
        characteristic.updateValue(this.platform.Characteristic.CurrentDoorState.CLOSED);
        break;
      case 'Closed':
        characteristic.updateValue(this.platform.Characteristic.CurrentDoorState.CLOSED);
        break;
      case 'Unknown':
      case undefined:
        if (v === 0) {
          characteristic.updateValue(this.platform.Characteristic.CurrentDoorState.CLOSED);
        } else if (v === 99) {
          characteristic.updateValue(this.platform.Characteristic.CurrentDoorState.OPEN);
        } else {
          characteristic.updateValue(this.platform.Characteristic.CurrentDoorState.CLOSED);
        }
        break;
      default:
        characteristic.updateValue(this.platform.Characteristic.CurrentDoorState.CLOSED);
        break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getObstructionDetected(characteristic, _service, _IDs, _properties) {
    characteristic.updateValue(0);
  }

  getBatteryLevel(characteristic, _service, _IDs, properties) {
    if (isNaN(properties.batteryLevel)) {
      this.platform.log('batteryLevel is not a number.', '');
      return;
    }
    let r = parseFloat(properties.batteryLevel);
    if (r > 100) {
      r = 0;
    }
    characteristic.updateValue(r);
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
      g = r.g, b = r.b, r = r.r;
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
    if (typeof value === 'number') {
      if (value === 0) {
        return false;
      } else {
        return true;
      }
    }
    if (typeof value === 'string') {
      const vNum = parseInt(value);
      if (!isNaN(vNum)) {
        if (vNum === 0) {
          return false;
        } else {
          return true;
        }
      }
    }

    switch (value) {
      case true:
      case 'true':
      case 'on':
      case 'yes':
        return true;
      default:
        return false;
    }
  }
}

