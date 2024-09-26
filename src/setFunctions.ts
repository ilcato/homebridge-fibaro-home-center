// setFunctions.ts

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
    const setValue = (delay = 100) => {
      setTimeout(() => {
        characteristic.setValue(0, undefined, 'fromSetValue');
      }, delay);
    };

    if (service.isVirtual && !service.isGlobalVariableSwitch && !service.isGlobalVariableDimmer) {
      // It's a virtual device so the command is pressButton and not turnOn or Off
      await this.command('pressButton', [IDs[1]], service, IDs);
      // In order to behave like a push button reset the status to off
      setValue();
    } else if (service.isScene) {
      // It's a scene so the command is execute scene
      await this.scene(IDs[0]);
      // In order to behave like a push button reset the status to off
      setValue();
    } else if (service.isGlobalVariableSwitch) {
      await this.setGlobalVariable(IDs[1], value ? 'true' : 'false');
    } else if (service.isGlobalVariableDimmer) {
      const currentDimmerValue = (await this.getGlobalVariable(IDs[1])).body.value;
      if (currentDimmerValue !== '0' && value) {
        return;
      }
      await this.setGlobalVariable(IDs[1], value ? '100' : '0');
    } else if (!this.timeoutsUpdating[IDs[0]]) {
      // Only execute if there's no ongoing update for this device
      await this.command(value ? 'turnOn' : 'turnOff', null, service, IDs);
    }
  }

  async setBrightness(value, context, characteristic, service, IDs) {
    // Handle global variable dimmer separately
    if (service.isGlobalVariableDimmer) {
      await this.setGlobalVariable(IDs[1], value.toString());
      return;
    }

    // Clear any existing timeout for this device
    clearTimeout(this.timeoutsUpdating[IDs[0]]);

    // Set a new timeout to update the brightness
    this.timeoutsUpdating[IDs[0]] = setTimeout(async () => {
      try {
        await this.command('setValue', [value], service, IDs);
      } catch (error) {
        this.platform.log.error(`Error setting brightness for device ${IDs[0]}:`, error);
      } finally {
        // Clear the timeout reference after execution
        this.timeoutsUpdating[IDs[0]] = null;
      }
    }, 500);
  }

  async setTargetPosition(value, context, characteristic, service, IDs) {
    if (service.isOpenCloseOnly) {
      // For open/close only devices, use specific commands based on the target position
      const action = value === 0 ? 'close' : value >= 99 ? 'open' : null;
      if (action) {
        await this.command(action, [0], service, IDs);
      }
      return;
    }

    // Clear any existing timeout for this device
    clearTimeout(this.timeoutsUpdating[IDs[0]]);

    // Set a new timeout to update the target position
    this.timeoutsUpdating[IDs[0]] = setTimeout(async () => {
      try {
        await this.command('setValue', [value], service, IDs);
      } catch (error) {
        this.platform.log.error(`Error setting target position for device ${IDs[0]}:`, error);
      } finally {
        // Clear the timeout reference after execution
        this.timeoutsUpdating[IDs[0]] = null;
      }
    }, 1200);
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
    const Characteristic = this.platform.Characteristic;
    const isUnsecured = value === Characteristic.LockTargetState.UNSECURED;

    if (service.isLockSwitch) {
      // Handle lock switch
      const action = isUnsecured ? 'turnOn' : 'turnOff';
      await this.command(action, null, service, IDs);
      service.getCharacteristic(Characteristic.LockCurrentState).updateValue(value, undefined, 'fromSetValue');
      return;
    }

    // Handle regular lock
    const action = isUnsecured ? 'unsecure' : 'secure';
    await this.command(action, [0], service, IDs);

    // Update lock current state after a delay
    setTimeout(() => {
      service.getCharacteristic(Characteristic.LockCurrentState).updateValue(value, undefined, 'fromSetValue');
    }, 1000);

    // Check if the action is correctly executed after a specified timeout
    if (this.platform.config.doorlocktimeout !== '0') {
      const timeout = parseInt(this.platform.config.doorlocktimeout) * 1000;
      setTimeout(() => this.checkLockCurrentState(IDs, value), timeout);
    }
  }

  async setTargetDoorState(value, context, characteristic, service, IDs) {
    const action = value === this.platform.Characteristic.TargetDoorState.CLOSED ? 'close' : 'open';
    await this.command(action, [0], service, IDs);

    setTimeout(() => {
      characteristic.setValue(value, undefined, 'fromSetValue');
      service.getCharacteristic(this.platform.Characteristic.CurrentDoorState)
        .setValue(value, undefined, 'fromSetValue');
    }, 100);
  }

  async setTargetHeatingCoolingState(value, context, characteristic, service, IDs) {
    if (!service.isClimateZone && !service.isHeatingZone) {
      return;
    }

    if (service.isHeatingZone) {
      return; // Early return for heating zones as they don't support mode changes
    }

    const { Characteristic } = this.platform;
    const modeMap = {
      [Characteristic.TargetHeatingCoolingState.OFF]: 'Off',
      [Characteristic.TargetHeatingCoolingState.HEAT]: 'Heat',
      [Characteristic.TargetHeatingCoolingState.COOL]: 'Cool',
      [Characteristic.TargetHeatingCoolingState.AUTO]: 'Auto',
    };

    const mode = modeMap[value];
    if (!mode) {
      return;
    }

    const currentTemperature = service.getCharacteristic(Characteristic.CurrentTemperature).value;
    const timestamp = Math.trunc(Date.now() / 1000) + parseInt(this.platform.config.thermostattimeout);

    await this.platform.fibaroClient.setClimateZoneHandTemperature(IDs[0], mode, currentTemperature, timestamp);
  }

  async setTargetTemperature(value, context, characteristic, service, IDs) {
    const timestamp = Math.trunc(Date.now() / 1000) + parseInt(this.platform.config.thermostattimeout);

    if (service.isClimateZone) {
      const { Characteristic } = this.platform;
      const modeMap = {
        [Characteristic.CurrentHeatingCoolingState.OFF]: 'Off',
        [Characteristic.CurrentHeatingCoolingState.HEAT]: 'Heat',
        [Characteristic.CurrentHeatingCoolingState.COOL]: 'Cool',
        [Characteristic.CurrentHeatingCoolingState.AUTO]: 'Auto',
      };

      const currentState = service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).value;
      const mode = modeMap[currentState];

      if (mode) {
        await this.platform.fibaroClient.setClimateZoneHandTemperature(IDs[0], mode, value, timestamp);
      }
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

  async setSecuritySystemTargetState(value) {
    const { Characteristic } = this.platform;

    const sceneMap = new Map([
      [Characteristic.SecuritySystemTargetState.AWAY_ARM, this.platform.scenes.SetAwayArmed],
      [Characteristic.SecuritySystemTargetState.DISARM, this.platform.scenes.SetDisarmed],
      [Characteristic.SecuritySystemTargetState.NIGHT_ARM, this.platform.scenes.SetNightArmed],
      [Characteristic.SecuritySystemTargetState.STAY_ARM, this.platform.scenes.SetStayArmed],
    ]);

    const sceneID = sceneMap.get(value);

    if (sceneID === undefined) {
      return;
    }

    if (value === Characteristic.SecuritySystemTargetState.DISARM) {
      value = Characteristic.SecuritySystemCurrentState.DISARMED;
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
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
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
        const nc = c.replace(/turnOn|turnOff|setValue|open|close/g, match => {
          const replacements = {
            turnOn: 'On',
            turnOff: 'Off',
            setValue: '',
            open: 'Open',
            close: 'Close',
          };
          return replacements[match] || match;
        });

        const logMessage = `${service.displayName} [${IDs[0]}]: set ${nc}${
          value !== null && nc !== 'Open' && nc !== 'Close' ? ` ${value}%` : ''
        }`;

        this.platform.log(logMessage);
      }
    } catch (error) {
      this.platform.log.error(`There was a problem sending command ${c} to ${IDs[0]}:`, error);
    }
  }

  async scene(sceneID) {
    try {
      await this.platform.fibaroClient.executeScene(sceneID, this.platform.isOldApi());
    } catch {
      this.platform.log.error('There was a problem executing scene: ', sceneID);
    }
  }

  async setGlobalVariable(variableID, value) {
    try {
      await this.platform.fibaroClient.setGlobalVariable(variableID, value);
    } catch {
      this.platform.log.error('There was a problem setting variable: ', `${variableID} to ${value}`);
    }
  }

  async getGlobalVariable(variableID) {
    try {
      const value = await this.platform.fibaroClient.getGlobalVariable(variableID);
      return value;
    } catch {
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

  static scale(num: number, in_min: number, in_max: number, out_min: number, out_max: number): number {
    return Math.trunc((num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min);
  }
}

