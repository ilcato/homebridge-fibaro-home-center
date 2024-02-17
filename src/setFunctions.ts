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

export const lowestTemp = 12;
export const stdTemp = 21;

export class SetFunctions {
  setFunctionsMapping;
  getTargetSecuritySystemSceneMapping;
  platform;
  timeoutsUpdating;

  constructor(platform) {
    this.platform = platform;
    this.timeoutsUpdating = [];

    const Characteristic = this.platform.Characteristic;
    this.setFunctionsMapping = new Map([
      [Characteristic.On.UUID, this.setOn],
      [Characteristic.Brightness.UUID, this.setBrightness],
      [Characteristic.TargetPosition.UUID, this.setTargetPosition],
      [Characteristic.HoldPosition.UUID, this.setHoldPosition],
      [Characteristic.TargetHorizontalTiltAngle.UUID, this.setTargetTiltAngle],
      [Characteristic.LockTargetState.UUID, this.setLockTargetState],
      [Characteristic.TargetHeatingCoolingState.UUID, this.setTargetHeatingCoolingState],
      [Characteristic.TargetTemperature.UUID, this.setTargetTemperature],
      [Characteristic.TargetDoorState.UUID, this.setTargetDoorState],
      [Characteristic.Hue.UUID, this.setHue],
      [Characteristic.Saturation.UUID, this.setSaturation],
      [Characteristic.SecuritySystemTargetState.UUID, this.setSecuritySystemTargetState],
      [Characteristic.Active.UUID, this.setActive],
    ]);

    this.getTargetSecuritySystemSceneMapping = new Map([
      [Characteristic.SecuritySystemTargetState.AWAY_ARM, this.platform.scenes.SetAwayArmed],
      [Characteristic.SecuritySystemTargetState.DISARM, this.platform.scenes.SetDisarmed],
      [Characteristic.SecuritySystemTargetState.NIGHT_ARM, this.platform.scenes.SetNightArmed],
      [Characteristic.SecuritySystemTargetState.STAY_ARM, this.platform.scenes.SetStayArmed],
    ]);
  }

  async setOn(value, context, characteristic, service, IDs) {
    if (service.isVirtual && !service.isGlobalVariableSwitch && !service.isGlobalVariableDimmer) {
      // It's a virtual device so the command is pressButton and not turnOn or Off
      this.command('pressButton', [IDs[1]], service, IDs);
      // In order to behave like a push button reset the status to off
      setTimeout(() => {
        characteristic.setValue(0, undefined, 'fromSetValue');
      }, 100);
    } else if (service.isScene) {
      // It's a scene so the command is execute scene
      this.scene(IDs[0]);
      // In order to behave like a push button reset the status to off
      setTimeout(() => {
        characteristic.setValue(0, undefined, 'fromSetValue');
      }, 100);
    } else if (service.isGlobalVariableSwitch) {
      this.setGlobalVariable(IDs[1], value === true ? 'true' : 'false');
    } else if (service.isGlobalVariableDimmer) {
      const currentDimmerValue = (await this.getGlobalVariable(IDs[1])).body.value;
      if (currentDimmerValue !== '0' && value === true) {
        return;
      }
      this.setGlobalVariable(IDs[1], value === true ? '100' : '0');
    } else {
      if (!this.timeoutsUpdating[IDs[0]]) { // see in setBrightness function
        await this.command(value ? 'turnOn' : 'turnOff', null, service, IDs);
      }
    }
  }

  async setBrightness(value, context, characteristic, service, IDs) {
    if (service.isGlobalVariableDimmer) {
      await this.setGlobalVariable(IDs[1], value.toString());
    } else {
      clearTimeout(this.timeoutsUpdating[IDs[0]]);
      this.timeoutsUpdating[IDs[0]] = null;
      this.timeoutsUpdating[IDs[0]] = setTimeout(async () => {
        await this.command('setValue', [value], service, IDs);
        clearTimeout(this.timeoutsUpdating[IDs[0]]);
        this.timeoutsUpdating[IDs[0]] = null;
      }, 500);
    }
  }

  async setTargetPosition(value, context, characteristic, service, IDs) {
    if (service.isOpenCloseOnly) {
      if (value === 0) {
        await this.command('close', [0], service, IDs);
      } else if (value >= 99) {
        await this.command('open', [0], service, IDs);
      }
    } else {
      clearTimeout(this.timeoutsUpdating[IDs[0]]);
      this.timeoutsUpdating[IDs[0]] = null;
      this.timeoutsUpdating[IDs[0]] = setTimeout(async () => {
        await this.command('setValue', [value], service, IDs);
        clearTimeout(this.timeoutsUpdating[IDs[0]]);
        this.timeoutsUpdating[IDs[0]] = null;
      }, 1200);
    }
  }

  async setHoldPosition(value, context, characteristic, service, IDs) {
    if (value) {
      await this.command('stop', [0], service, IDs);
    }
  }

  async setTargetTiltAngle(angle, context, characteristic, service, IDs) {
    const value2 = SetFunctions.scale(angle, characteristic.props.minValue, characteristic.props.maxValue, 0, 100);
    await this.command('setValue2', [value2], service, IDs);
  }

  async setLockTargetState(value, context, characteristic, service, IDs) {
    if (service.isLockSwitch) {
      const action = (value === this.platform.Characteristic.LockTargetState.UNSECURED) ? 'turnOn' : 'turnOff';
      await this.command(action, null, service, IDs);
      const lockCurrentStateCharacteristic = service.getCharacteristic(this.platform.Characteristic.LockCurrentState);
      lockCurrentStateCharacteristic.updateValue(value, undefined, 'fromSetValue');
      return;
    }

    const action = (value === this.platform.Characteristic.LockTargetState.UNSECURED) ? 'unsecure' : 'secure';
    await this.command(action, [0], service, IDs);
    setTimeout(() => {
      const lockCurrentStateCharacteristic = service.getCharacteristic(this.platform.Characteristic.LockCurrentState);
      lockCurrentStateCharacteristic.updateValue(value, undefined, 'fromSetValue');
    }, 1000);
    // check if the action is correctly executed by reading the state after a specified timeout.
    // If the lock is not active after the timeout an IFTTT message is generated
    if (this.platform.config.doorlocktimeout !== '0') {
      const timeout = parseInt(this.platform.config.doorlocktimeout) * 1000;
      setTimeout(() => {
        this.checkLockCurrentState(IDs, value);
      }, timeout);
    }
  }

  async setTargetDoorState(value, context, characteristic, service, IDs) {
    const action = value === 1 ? 'close' : 'open';
    await this.command(action, [0], service, IDs);
    setTimeout(() => {
      characteristic.setValue(value, undefined, 'fromSetValue');
      // set also current state
      const currentDoorStateCharacteristic = service.getCharacteristic(this.platform.Characteristic.CurrentDoorState);
      currentDoorStateCharacteristic.setValue(value, undefined, 'fromSetValue');
    }, 100);
  }

  async setTargetHeatingCoolingState(value, context, characteristic, service, IDs) {
    if (service.isClimateZone) {
      const currentTemperature = service.getCharacteristic(this.platform.Characteristic.CurrentTemperature).value;
      let mode = '';
      switch (value) {
        case this.platform.Characteristic.TargetHeatingCoolingState.OFF:
          mode = 'Off';
          break;
        case this.platform.Characteristic.TargetHeatingCoolingState.HEAT:
          mode = 'Heat';
          break;
        case this.platform.Characteristic.TargetHeatingCoolingState.COOL:
          mode = 'Cool';
          break;
        case this.platform.Characteristic.TargetHeatingCoolingState.AUTO:
          mode = 'Auto';
          break;
        default:
          return;
      }
      const timestamp = parseInt(this.platform.config.thermostattimeout) + Math.trunc((new Date()).getTime() / 1000);
      await this.platform.fibaroClient.setClimateZoneHandTemperature(IDs[0], mode, currentTemperature, timestamp);
    } else if (service.isHeatingZone) {
      return;
    }
  }

  async setTargetTemperature(value, context, characteristic, service, IDs) {
    const timestamp = parseInt(this.platform.config.thermostattimeout) + Math.trunc((new Date()).getTime() / 1000);
    if (service.isClimateZone) {
      let mode = '';
      const currentHeatingCoolingState = service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState).value;
      switch (currentHeatingCoolingState) {
        case this.platform.Characteristic.CurrentHeatingCoolingState.OFF:
          mode = 'Off';
          break;
        case this.platform.Characteristic.CurrentHeatingCoolingState.HEAT:
          mode = 'Heat';
          break;
        case this.platform.Characteristic.CurrentHeatingCoolingState.COOL:
          mode = 'Cool';
          break;
        case this.platform.Characteristic.CurrentHeatingCoolingState.AUTO:
          mode = 'Auto';
          break;
        default:
          return;
      }
      await this.platform.fibaroClient.setClimateZoneHandTemperature(IDs[0], mode, value, timestamp);
    } else if (service.isHeatingZone) {
      await this.platform.fibaroClient.setHeatingZoneHandTemperature(IDs[0], value, timestamp);
    }
  }

  setHue(value, context, characteristic, service, IDs) {
    this.updateHomeCenterColorFromHomeKit(value, null, service, IDs);
  }

  setSaturation(value, context, characteristic, service, IDs) {
    this.updateHomeCenterColorFromHomeKit(null, value, service, IDs);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async setSecuritySystemTargetState(value, context, characteristic, service, IDs) {
    const sceneID = this.getTargetSecuritySystemSceneMapping.get(value);
    if (value === this.platform.Characteristic.SecuritySystemTargetState.DISARM) {
      value = this.platform.Characteristic.SecuritySystemCurrentState.DISARMED;
    }
    if (sceneID === undefined) {
      return;
    }
    await this.scene(sceneID);
  }

  async setActive(value, context, characteristic, service, IDs) {
    const action = (value === this.platform.Characteristic.Active.ACTIVE) ? 'turnOn' : 'turnOff';
    await this.command(action, null, service, IDs);
  }

  async updateHomeCenterColorFromHomeKit(h, s, service, IDs) {
    if (h !== null) {
      service.h = h;
    }
    if (s !== null) {
      service.s = s;
    }
    if (service.h !== undefined && service.s !== undefined) {
      const v = service.characteristics[2].value;
      const rgbw = this.HSVtoRGB(service.h, service.s, v);
      await this.command('setColor', [rgbw.r, rgbw.g, rgbw.b, rgbw.w], service, IDs);
      await this.command('setValue', [v], service, IDs);
      delete service.h;
      delete service.s;
    }
  }

  HSVtoRGB(hue, saturation, value) {
    const h = hue / 360.0;
    const s = saturation / 100.0;
    const v = value / 100.0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r, g, b;
    switch (i % 6) {
      case 0: r = v, g = t, b = p; break;
      case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break;
      case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break;
      case 5: r = v, g = p, b = q; break;
    }
    const w = Math.min(r, g, b);
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
      w: Math.round(w * 255),
    };
  }

  async command(c, value, service, IDs) {
    try {
      await this.platform.fibaroClient.executeDeviceAction(IDs[0], c, value);
      if (this.platform.config.logsLevel >= 1) {
        const nc = c.replaceAll('turnOn', 'On').replaceAll('turnOff', 'Off').replaceAll('setValue', '')
          .replaceAll('open', 'Open').replaceAll('close', 'Close');
        this.platform.log(service.displayName + ' [' + IDs[0] + ']: set ' + nc
          + ((value !== null && nc !== 'Open' && nc !== 'Close') ? '' + value + ' %' : ''));
      }
    } catch (e) {
      this.platform.log.error('There was a problem sending command ', c + ' to ' + IDs[0]);
    }
  }

  async scene(sceneID) {
    try {
      await this.platform.fibaroClient.executeScene(sceneID, this.platform.isOldApi());
    } catch (e) {
      this.platform.log.error('There was a problem executing scene: ', sceneID);
    }
  }

  async setGlobalVariable(variableID, value) {
    try {
      await this.platform.fibaroClient.setGlobalVariable(variableID, value);
    } catch (e) {
      this.platform.log.error('There was a problem setting variable: ', `${variableID} to ${value}`);
    }
  }

  async getGlobalVariable(variableID) {
    try {
      const value = await this.platform.fibaroClient.getGlobalVariable(variableID);
      return value;
    } catch (e) {
      this.platform.log.error('There was a problem getting variable: ', `${variableID}`);
    }
  }

  async checkLockCurrentState(IDs, value) {
    try {
      const properties = (await this.platform.fibaroClient.getDeviceProperties(IDs[0])).body.properties;
      const currentValue = (properties.value === true) ?
        this.platform.Characteristic.LockCurrentState.SECURED : this.platform.Characteristic.LockCurrentState.UNSECURED;
      if (currentValue !== value) {
        this.platform.log.error('There was a problem setting value to Lock: ', `${IDs[0]}`);
      }
    } catch (e) {
      this.platform.log.error('There was a problem getting value from: ', `${IDs[0]} - Err: ${e}`);
    }
  }

  /***
   *  Scale the value from input range to output range as integer
   * @param num value to be scaled
   * @param in_min input value range minimum
   * @param in_max input value range maximum
   * @param out_min output value range minimum
   * @param out_max output value range maximum
   */
  static scale(num: number, in_min: number, in_max: number, out_min: number, out_max: number): number {
    return Math.trunc((num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min);
  }
}

