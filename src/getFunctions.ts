//    Copyright 2021 ilcato
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

      this.getFunctionsMapping = new Map([
        [(new platform.Characteristic.On()).UUID, { 'function': this.getBool, 'delay': 0 }],
        [(new platform.Characteristic.Brightness()).UUID, { 'function': this.getBrightness, 'delay': 0 }],
        [(new platform.Characteristic.PositionState()).UUID, { 'function': this.getPositionState, 'delay': 0 }],
        [(new platform.Characteristic.CurrentPosition()).UUID, { 'function': this.getCurrentPosition, 'delay': 0 }],
        [(new platform.Characteristic.TargetPosition()).UUID, { 'function': this.getCurrentPosition, 'delay': 0 }],
        [(new platform.Characteristic.CurrentHorizontalTiltAngle()).UUID, { 'function': this.getCurrentTiltAngle, 'delay': 0 }],
        [(new platform.Characteristic.TargetHorizontalTiltAngle()).UUID, { 'function': this.getCurrentTiltAngle, 'delay': 0 }],
        [(new platform.Characteristic.MotionDetected()).UUID, { 'function': this.getBool, 'delay': 0 }],
        [(new platform.Characteristic.CurrentTemperature()).UUID, { 'function': this.getCurrentTemperature, 'delay': 0 }],
        [(new platform.Characteristic.TargetTemperature()).UUID, { 'function': this.getTargetTemperature, 'delay': 0 }],
        [(new platform.Characteristic.CurrentRelativeHumidity()).UUID, { 'function': this.getFloat, 'delay': 0 }],
        [(new platform.Characteristic.ContactSensorState()).UUID, { 'function': this.getContactSensorState, 'delay': 0 }],
        [(new platform.Characteristic.LeakDetected()).UUID, { 'function': this.getLeakDetected, 'delay': 0 }],
        [(new platform.Characteristic.SmokeDetected()).UUID, { 'function': this.getSmokeDetected, 'delay': 0 }],
        [(new platform.Characteristic.CarbonMonoxideDetected()).UUID, { 'function': this.getCarbonMonoxideDetected, 'delay': 0 }],
        [(new platform.Characteristic.CarbonMonoxideLevel()).UUID, { 'function': this.getCarbonMonoxideLevel, 'delay': 0 }],
        [(new platform.Characteristic.CarbonMonoxidePeakLevel()).UUID, { 'function': this.getCarbonMonoxidePeakLevel, 'delay': 0 }],
        [(new platform.Characteristic.CurrentAmbientLightLevel()).UUID, { 'function': this.getFloat, 'delay': 0 }],
        [(new platform.Characteristic.OutletInUse()).UUID, { 'function': this.getOutletInUse, 'delay': 0 }],
        [(new platform.Characteristic.LockCurrentState()).UUID,
          { 'function': this.getLockCurrentState, 'delay': this.platform.config.LockCurrentStateDelay }],
        [(new platform.Characteristic.LockTargetState()).UUID,
          { 'function': this.getLockCurrentState, 'delay': this.platform.config.LockTargetStateDelay }],
        [(new platform.Characteristic.CurrentHeatingCoolingState()).UUID, { 'function': this.getCurrentHeatingCoolingState, 'delay': 0 }],
        [(new platform.Characteristic.TargetHeatingCoolingState()).UUID, { 'function': this.getTargetHeatingCoolingState, 'delay': 0 }],
        [(new platform.Characteristic.TemperatureDisplayUnits()).UUID, { 'function': this.getTemperatureDisplayUnits, 'delay': 0 }],
        [(new platform.Characteristic.Hue()).UUID, { 'function': this.getHue, 'delay': 0 }],
        [(new platform.Characteristic.Saturation()).UUID, { 'function': this.getSaturation, 'delay': 0 }],
        [(new platform.Characteristic.CurrentDoorState()).UUID, { 'function': this.getCurrentDoorState, 'delay': 0 }],
        [(new platform.Characteristic.TargetDoorState()).UUID, { 'function': this.getCurrentDoorState, 'delay': 0 }],
        [(new platform.Characteristic.ObstructionDetected()).UUID, { 'function': this.getObstructionDetected, 'delay': 0 }],
        [(new platform.Characteristic.BatteryLevel()).UUID, { 'function': this.getBatteryLevel, 'delay': 0 }],
        [(new platform.Characteristic.ChargingState()).UUID, { 'function': this.getChargingState, 'delay': 0 }],
        [(new platform.Characteristic.StatusLowBattery()).UUID, { 'function': this.getStatusLowBattery, 'delay': 0 }],
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
    getFloat(characteristic, service, IDs, properties) {
      if (isNaN(properties.value)) {
        return;
      }
      const r = parseFloat(properties.value);
      characteristic.updateValue(r);
    }

    getBrightness(characteristic, service, IDs, properties) {
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
      characteristic.updateValue(r);
    }

    getPositionState(characteristic, service, IDs, properties) {
      characteristic.updateValue(this.platform.Characteristic.PositionState.STOPPED);
    }

    getCurrentPosition(characteristic, service, IDs, properties) {
      let r = parseInt(properties.value);
      if (r >= characteristic.props.minValue && r <= characteristic.props.maxValue) {
        if (r === 99) {
          r = 100;
        } else if (r === 1) {
          r = 0;
        }
      } else {
        r = characteristic.props.minValue;
      }
      characteristic.updateValue(r);
    }

    getCurrentTiltAngle(characteristic, service, IDs, properties) {
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
      if (service.isClimateZone) {
        try {
          const properties = (await this.platform.fibaroClient.getClimateZone(IDs[0])).body.properties;
          if (!Object.prototype.hasOwnProperty.call(properties, 'currentTemperatureHeating')) {
            this.platform.log('No value for Temperature.', '');
            return;
          }
          characteristic.updateValue(properties.currentTemperatureHeating);
        } catch (e) {
          this.platform.log('There was a problem getting value from: ', `${service.IDs[0]} - Err: ${e}`);
          return;
        }
      } else if (service.isHeatingZone) {
        try {
          const properties = (await this.platform.fibaroClient.getHeatingZone(IDs[0])).body.properties;
          if (!Object.prototype.hasOwnProperty.call(properties, 'currentTemperature')) {
            this.platform.log('No value for Temperature.', '');
            return;
          }
          characteristic.updateValue(properties.currentTemperature);
        } catch (e) {
          this.platform.log('There was a problem getting value from: ', `${service.IDs[0]} - Err: ${e}`);
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
            this.platform.log('No value for Temperature.', '');
            return;
          }
          characteristic.updateValue(properties.currentTemperatureHeating);
        } catch (e) {
          this.platform.log('There was a problem getting value from: ', `${service.IDs[0]} - Err: ${e}`);
          return;
        }
      } else if (service.isHeatingZone) {
        try {
          const properties = (await this.platform.fibaroClient.getHeatingZone(IDs[0])).body.properties;
          if (!properties.handTemperature) {
            this.platform.log('No value for Temperature.', '');
            return;
          }
          characteristic.updateValue(properties.handTemperature);
        } catch (e) {
          this.platform.log('There was a problem getting value from: ', `${service.IDs[0]} - Err: ${e}`);
        }
      } else {
        const value = properties.value;
        characteristic.updateValue(value);
      }
    }

    getContactSensorState(characteristic, service, IDs, properties) {
      const v = this.getBoolean(properties.value);
      characteristic.updateValue(v === false ?
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
    }

    getLeakDetected(characteristic, service, IDs, properties) {
      const v = this.getBoolean(properties.value);
      characteristic.updateValue(v === true ?
        this.platform.Characteristic.LeakDetected.LEAK_DETECTED :
        this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED);
    }

    getSmokeDetected(characteristic, service, IDs, properties) {
      const v = this.getBoolean(properties.value);
      characteristic.updateValue(v === true ?
        this.platform.Characteristic.SmokeDetected.SMOKE_DETECTED :
        this.platform.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
    }

    getCarbonMonoxideDetected(characteristic, service, IDs, properties) {
      const v = this.getBoolean(properties.value);
      characteristic.updateValue(v === true ?
        this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL :
        this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL);
    }

    getCarbonMonoxideLevel(characteristic, service, IDs, properties) {
      const r = parseFloat(properties.concentration);
      characteristic.updateValue(r);
    }

    getCarbonMonoxidePeakLevel(characteristic, service, IDs, properties) {
      const r = parseFloat(properties.maxConcentration);
      characteristic.updateValue(r);
    }

    getOutletInUse(characteristic, service, IDs, properties) {
      if (isNaN(properties.power)) {
        this.platform.log('power is not a number.', '');
        return;
      }
      characteristic.updateValue(parseFloat(properties.power) > 1.0 ? true : false);
    }

    getLockCurrentState(characteristic, service, IDs, properties) {
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

    async getCurrentHeatingCoolingState(characteristic, service, IDs, properties) {
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

    async getTargetHeatingCoolingState(characteristic, service, IDs, properties) {
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

    getTemperatureDisplayUnits(characteristic, service, IDs, properties) {
      characteristic.updateValue(this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);
    }

    getHue(characteristic, service, IDs, properties) {
      characteristic.updateValue(Math.round(this.updateHomeKitColorFromHomeCenter(properties.color, service).h));
    }

    getSaturation(characteristic, service, IDs, properties) {
      characteristic.updateValue(Math.round(this.updateHomeKitColorFromHomeCenter(properties.color, service).s));
    }

    getCurrentDoorState(characteristic, service, IDs, properties) {
      characteristic.updateValue(properties.state === 'Closed' ?
        this.platform.Characteristic.CurrentDoorState.CLOSED :
        this.platform.Characteristic.CurrentDoorState.OPEN);
    }

    getObstructionDetected(characteristic, service, IDs, properties) {
      characteristic.updateValue(0);
    }

    getBatteryLevel(characteristic, service, IDs, properties) {
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

    getChargingState(characteristic, service, IDs, properties) {
      const r = 0;//parseFloat(properties.batteryLevel);
      characteristic.updateValue(r);
    }

    getStatusLowBattery(characteristic, service, IDs, properties) {
      if (isNaN(properties.batteryLevel)) {
        this.platform.log('batteryLevel is not a number.', '');
        return;
      }
      const batteryLevel = parseFloat(properties.batteryLevel);
      const r = (batteryLevel <= 20 || batteryLevel > 100) ? 1 : 0;
      characteristic.updateValue(r);
    }

    getSecuritySystemState(characteristic, service, IDs, securitySystemStatus) {
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

    updateHomeKitColorFromHomeCenter(color, service) {
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

