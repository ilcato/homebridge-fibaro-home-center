// setFunctions.ts

import { Utils } from './utils';
import { Characteristic } from 'hap-nodejs';

// Decorator function
function characteristicSetter(...characteristics: string[]) {
  return function (target, propertyKey: string, descriptor: PropertyDescriptor) {
    if (!target.constructor.setFunctionsMapping) {
      target.constructor.setFunctionsMapping = new Map();
    }
    characteristics.forEach(char => {
      target.constructor.setFunctionsMapping.set(char, descriptor.value);
    });
  };
}

export class SetFunctions {
  static setFunctionsMapping: Map<string, (...args: unknown[]) => unknown>;
  private timeoutsUpdating;

  constructor(private platform) {
    this.timeoutsUpdating = [];

    // Initialize the static mapping if not already done
    if (!SetFunctions.setFunctionsMapping) {
      SetFunctions.setFunctionsMapping = new Map();
    }
  }

  @characteristicSetter(Characteristic.On.UUID)
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

  @characteristicSetter(Characteristic.Brightness.UUID)
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

  @characteristicSetter(Characteristic.TargetPosition.UUID)
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

  @characteristicSetter(Characteristic.HoldPosition.UUID)
  async setHoldPosition(value, context, characteristic, service, IDs) {
    if (value) {
      await this.command('stop', [0], service, IDs);
    }
  }

  @characteristicSetter(Characteristic.TargetHorizontalTiltAngle.UUID)
  async setTargetTiltAngle(angle, context, characteristic, service, IDs) {
    const value2 = Utils.scale(angle, characteristic.props.minValue, characteristic.props.maxValue, 0, 100);
    await this.command('setValue2', [value2], service, IDs);
  }

  @characteristicSetter(Characteristic.LockTargetState.UUID)
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

  @characteristicSetter(Characteristic.TargetDoorState.UUID)
  async setTargetDoorState(value, context, characteristic, service, IDs) {
    const action = value === this.platform.Characteristic.TargetDoorState.CLOSED ? 'close' : 'open';
    await this.command(action, [0], service, IDs);

    setTimeout(() => {
      characteristic.setValue(value, undefined, 'fromSetValue');
      service.getCharacteristic(this.platform.Characteristic.CurrentDoorState)
        .setValue(value, undefined, 'fromSetValue');
    }, 100);
  }

  @characteristicSetter(Characteristic.TargetHeatingCoolingState.UUID)
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

  @characteristicSetter(Characteristic.TargetTemperature.UUID)
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

  @characteristicSetter(Characteristic.Hue.UUID)
  async setHue(value, context, characteristic, service, IDs) {
    this.updateHomeCenterColorFromHomeKit(value, null, service, IDs);
  }

  @characteristicSetter(Characteristic.Saturation.UUID)
  async setSaturation(value, context, characteristic, service, IDs) {
    this.updateHomeCenterColorFromHomeKit(null, value, service, IDs);
  }

  @characteristicSetter(Characteristic.SecuritySystemTargetState.UUID)
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

  @characteristicSetter(Characteristic.Active.UUID)
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
      const rgbw = Utils.HSVtoRGB(service.h, service.s, v);
      await this.command('setColor', [rgbw.r, rgbw.g, rgbw.b, rgbw.w], service, IDs);
      await this.command('setValue', [v], service, IDs);
      delete service.h;
      delete service.s;
    }
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
}