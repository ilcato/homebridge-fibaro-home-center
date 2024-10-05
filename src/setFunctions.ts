// setFunctions.ts

import 'reflect-metadata';
import { Utils } from './utils';
import { Characteristics } from './constants';

// Decorator function for mapping setCharacteristicValue to the Characteristic
function characteristicSetter(...characteristics: unknown[]) {
  return function (target, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingMethods = Reflect.getMetadata('characteristicMethods', target) || [];
    existingMethods.push([propertyKey, characteristics]);
    Reflect.defineMetadata('characteristicMethods', existingMethods, target);
    return descriptor;
  };
}

export class SetFunctions {
  setFunctionsMapping: Map<unknown, (...args: unknown[]) => unknown>;

  constructor(private platform) {
    this.setFunctionsMapping = new Map();
    this.initializeFunctionsMapping();
  }

  private initializeFunctionsMapping() {
    const prototype = Object.getPrototypeOf(this);
    const characteristicMethods = Reflect.getMetadata('characteristicMethods', prototype) || [];

    for (const [methodName, characteristics] of characteristicMethods) {
      for (const characteristic of characteristics) {
        this.setFunctionsMapping.set(this.platform.Characteristic[characteristic], this[methodName].bind(this));
      }
    }
  }

  @characteristicSetter(Characteristics.On)
  async setOn(value, context, characteristic, service, IDs, callback) {
    try {
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
      } else {
        await this.command(value ? 'turnOn' : 'turnOff', null, service, IDs);
      }
      callback();
    } catch (error) {
      callback(error);
      this.platform.log.error(`Error setting On for device ${IDs[0]}:`, error);
    }
  }

  @characteristicSetter(Characteristics.Brightness)
  async setBrightness(value, context, characteristic, service, IDs, callback) {
    // Handle global variable dimmer separately
    if (service.isGlobalVariableDimmer) {
      await this.setGlobalVariable(IDs[1], value.toString());
      return;
    }

    try {
      await this.command('setValue', [value], service, IDs);
      characteristic.updateValue(value, undefined, 'fromSetValue');
      callback();
    } catch (error) {
      callback(error);
      this.platform.log.error(`Error setting brightness for device ${IDs[0]}:`, error);
    }
  }

  @characteristicSetter(Characteristics.TargetPosition)
  async setTargetPosition(value, context, characteristic, service, IDs, callback) {
    try {
      if (service.isOpenCloseOnly) {
        // For open/close only devices, use specific commands based on the target position
        const action = value === 0 ? 'close' : value >= 99 ? 'open' : null;
        if (action) {
          await this.command(action, [0], service, IDs);
        }
        return;
      }

      try {
        await this.command('setValue', [value], service, IDs);
      } catch (error) {
        this.platform.log.error(`Error setting target position for device ${IDs[0]}:`, error);
      }
      callback();
    } catch (error) {
      callback(error);
      this.platform.log.error(`Error setting target position for device ${IDs[0]}:`, error);
    }
  }

  @characteristicSetter(Characteristics.HoldPosition)
  async setHoldPosition(value, context, characteristic, service, IDs, callback) {
    try {
      if (value) {
        await this.command('stop', [0], service, IDs);
      }
      callback();
    } catch (error) {
      callback(error);
      this.platform.log.error(`Error setting hold position for device ${IDs[0]}:`, error);
    }
  }

  @characteristicSetter(Characteristics.TargetHorizontalTiltAngle)
  async setTargetTiltAngle(angle, context, characteristic, service, IDs) {
    const value2 = Utils.scale(angle, characteristic.props.minValue, characteristic.props.maxValue, 0, 100);
    await this.command('setValue2', [value2], service, IDs);
  }

  @characteristicSetter(Characteristics.LockTargetState)
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

  @characteristicSetter(Characteristics.TargetDoorState)
  async setTargetDoorState(value, context, characteristic, service, IDs) {
    const action = value === this.platform.Characteristic.TargetDoorState.CLOSED ? 'close' : 'open';
    await this.command(action, [0], service, IDs);

    setTimeout(() => {
      characteristic.setValue(value, undefined, 'fromSetValue');
      service.getCharacteristic(this.platform.Characteristic.CurrentDoorState)
        .setValue(value, undefined, 'fromSetValue');
    }, 100);
  }

  @characteristicSetter(Characteristics.TargetHeatingCoolingState)
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

  @characteristicSetter(Characteristics.TargetTemperature)
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

  @characteristicSetter(Characteristics.Hue)
  async setHue(value, context, characteristic, service, IDs) {
    this.updateHomeCenterColorFromHomeKit(value, null, service, IDs);
  }

  @characteristicSetter(Characteristics.Saturation)
  async setSaturation(value, context, characteristic, service, IDs) {
    this.updateHomeCenterColorFromHomeKit(null, value, service, IDs);
  }

  @characteristicSetter(Characteristics.SecuritySystemTargetState)
  async setSecuritySystemTargetState(value, context, characteristic, service, IDs, callback) {
    try {
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
      callback();
    } catch (error) {
      callback(error);
      this.platform.log.error('Error setting security system target state:', error);
    }
  }

  @characteristicSetter(Characteristics.Active)
  async setActive(value, context, characteristic, service, IDs, callback) {
    try {
      const action = (value === this.platform.Characteristic.Active.ACTIVE) ? 'turnOn' : 'turnOff';
      await this.command(action, null, service, IDs);
      callback();
    } catch (error) {
      callback(error);
      this.platform.log.error(`Error setting active state for device ${IDs[0]}:`, error);
    }
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