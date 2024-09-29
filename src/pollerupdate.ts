// pollerupdate.ts

'use strict';

import * as constants from './constants';

export class Poller {
  private platform;
  private pollingUpdateRunning: boolean;
  private lastPoll: number;
  private pollerPeriod: number;
  private timeout: NodeJS.Timeout | null;

  constructor(platform, pollerPeriod: number) {
    this.platform = platform;
    this.pollingUpdateRunning = false;
    this.lastPoll = 0;
    this.pollerPeriod = pollerPeriod;
    this.timeout = null;
  }

  async poll() {
    if (this.pollingUpdateRunning) {
      return;
    }
    this.pollingUpdateRunning = true;

    try {
      const { body: updates } = await this.platform.fibaroClient.refreshStates(this.lastPoll);

      if (updates.last !== undefined) {
        this.lastPoll = updates.last;
      }

      if (updates.changes) {
        updates.changes.forEach(this.handleChange.bind(this));
      }

      // Manage global variable switches and dimmers
      await Promise.all([
        this.manageGlobalVariableDevice(this.platform.config.switchglobalvariables, 'G'),
        this.manageGlobalVariableDevice(this.platform.config.dimmerglobalvariables, 'D'),
      ]);

      // Manage Security System state
      if (this.platform.config.securitysystem === 'enabled') {
        await this.manageSecuritySystem();
      }

      this.pollingUpdateRunning = false;
      this.restartPoll(this.pollerPeriod * 1000);

      if (this.platform.config.logsLevel > 1) {
        this.platform.log.debug('Restarting poller...');
      }
    } catch (e) {
      this.handlePollingError(e);
    }
  }

  private handleChange(change) {
    if (change.value !== undefined || change.value2 !== undefined) {
      this.manageValue(change);
    } else if (change['ui.startStopActivitySwitch.value'] !== undefined) {
      this.manageValue({ ...change, value: change['ui.startStopActivitySwitch.value'] });
    } else if (change.color !== undefined) {
      this.manageColor(change);
    } else if (change.thermostatMode !== undefined) {
      this.manageOperatingMode(change);
    } else if (change.heatingThermostatSetpoint !== undefined) {
      this.manageHeatingThermostatSetpoint(change);
    }
  }

  private handlePollingError(e) {
    this.platform.log.error('Error fetching updates: ', e);
    if (e === 400) {
      this.lastPoll = 0;
    }
    this.pollingUpdateRunning = false;
    this.restartPoll(60 * 1000);
    this.platform.log.error('Next try in 1 minute');
  }

  restartPoll(delay: number) {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    if (delay > 0) {
      this.timeout = setTimeout(() => this.poll(), delay);
    }
  }

  cancelPoll() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  private manageValue(change) {
    this.platform.updateSubscriptions.forEach(subscription => {
      if (!(subscription.service instanceof this.platform.Service.Battery) && subscription.characteristic.displayName !== 'Name') {
        const { property, id, characteristic, service } = subscription;
        if (parseInt(id) === change.id &&
            ((property === 'value' && change.value !== undefined) || (property === 'value2' && change.value2 !== undefined))) {

          if (this.platform.config.FibaroTemperatureUnit === constants.CONFIG_FIBARO_TEMPERATURE_UNIT_FAHRENHEIT &&
              characteristic.displayName === 'Current Temperature') {
            change.value = (change.value - 32) * 5 / 9;
          }

          const getFunction = this.platform.getFunctions.getFunctionsMapping.get(characteristic.UUID);
          if (getFunction) {
            const IDs = service.subtype.split('-');
            getFunction.call(this.platform.getFunctions, characteristic, service, IDs, change);
            this.logValueChange(subscription, characteristic);
          }
        }
      }
    });
  }

  private logValueChange(subscription, characteristic) {
    if (this.platform.config.logsLevel >= 1) {
      let val1 = '', val2 = '';
      switch (characteristic.displayName) {
        case 'Current Temperature':
          val1 = characteristic.value.toFixed(1);
          val2 = this.platform.config.FibaroTemperatureUnit === constants.CONFIG_FIBARO_TEMPERATURE_UNIT_FAHRENHEIT ?
            constants.CONFIG_FIBARO_TEMPERATURE_UNIT_FAHRENHEIT : constants.CONFIG_FIBARO_TEMPERATURE_UNIT_CELSIUS;
          break;
        case 'Current Relative Humidity':
        case 'Brightness':
        case 'Current Position':
        case 'Target Position':
          val1 = characteristic.value.toFixed(0);
          val2 = '%';
          break;
        case 'Current Ambient Light Level':
          val1 = characteristic.value.toFixed(0);
          val2 = 'lux';
          break;
        case 'On':
          val1 = characteristic.value === true || characteristic.value === 'turnOn' ? 'On' : 'Off';
          break;
        case 'Motion Detected':
          val1 = characteristic.value ? 'Motion detected' : 'No motion';
          break;
        default:
          val1 = characteristic.value;
      }
      this.platform.log.info(`${subscription.service.displayName} [${subscription.id}]:`, `${val1}`, `${val2}`);
    }
  }

  async manageGlobalVariableDevice(param: string, type: string) {
    if (param !== '') {
      const globalVariables = param.split(',');
      for (const globalVariable of globalVariables) {
        const value = (await this.platform.fibaroClient.getGlobalVariable(globalVariable)).body;
        let service, characteristic;
        switch (type) {
          case 'G':
            service = this.platform.findServiceByName(globalVariable, this.platform.Service.Switch);
            characteristic = service.getCharacteristic(this.platform.Characteristic.On);
            this.platform.getFunctions.getBool(characteristic, null, null, value);
            break;
          case 'D':
            service = this.platform.findServiceByName(globalVariable, this.platform.Service.Lightbulb);
            characteristic = service.getCharacteristic(this.platform.Characteristic.On);
            this.platform.getFunctions.getBool(characteristic, null, null, value);
            characteristic = service.getCharacteristic(this.platform.Characteristic.Brightness);
            this.platform.getFunctions.getBrightness(characteristic, null, null, value);
            break;
          default:
            break;
        }
      }
    }
  }

  async manageSecuritySystem() {
    const securitySystemStatus = (await this.platform.fibaroClient.getGlobalVariable(constants.SECURITY_SYSTEM_GLOBAL_VARIABLE)).body;

    const service = this.platform.findServiceByName('FibaroSecuritySystem', this.platform.Service.SecuritySystem);

    if (service !== undefined) {
      const state = this.platform.getFunctions.getCurrentSecuritySystemStateMapping.get(securitySystemStatus.value);
      if (state !== undefined) {
        const characteristic = service.getCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState);
        if (characteristic.value !== state) {
          characteristic.updateValue(state);
        }
      }
    }
  }

  manageColor(change) {
    this.platform.updateSubscriptions.forEach(subscription => {
      if (parseInt(subscription.id) === change.id && subscription.property === 'color') {
        const hsv = this.platform.getFunctions.updateHomeKitColorFromHomeCenter(change.color, subscription.service);
        const { characteristic } = subscription;
        if (characteristic.UUID === (new this.platform.Characteristic.On()).UUID) {
          characteristic.updateValue(hsv.v === 0 ? false : true);
        } else if (characteristic.UUID === (new this.platform.Characteristic.Hue()).UUID) {
          characteristic.updateValue(Math.round(hsv.h));
        } else if (characteristic.UUID === (new this.platform.Characteristic.Saturation()).UUID) {
          characteristic.updateValue(Math.round(hsv.s));
        } else if (characteristic.UUID === (new this.platform.Characteristic.Brightness()).UUID) {
          characteristic.updateValue(Math.round(hsv.v));
        }
      }
    });
  }

  manageOperatingMode(change) {
    this.platform.updateSubscriptions.forEach(subscription => {
      if (parseInt(subscription.id) === change.id && subscription.property === 'mode') {
        this.platform.log.info('Updating value for device: ',
          `${subscription.id}  parameter: ${subscription.characteristic.displayName}, value: ${change.thermostatMode}`);
        const getFunction = this.platform.getFunctions.getFunctionsMapping.get(subscription.characteristic.UUID);
        if (getFunction) {
          getFunction.call(this.platform.getFunctions, subscription.characteristic, subscription.service, null, change);
        }
      }
    });
  }

  manageHeatingThermostatSetpoint(change) {
    this.platform.updateSubscriptions.forEach(subscription => {
      if (parseInt(subscription.id) === change.id && subscription.property === 'targettemperature') {
        this.platform.log.info('Updating value for device: ',
          `${subscription.id}  parameter: ${subscription.characteristic.displayName}, value: ${change.heatingThermostatSetpoint}`);
        const getFunction = this.platform.getFunctions.getFunctionsMapping.get(subscription.characteristic.UUID);
        if (getFunction) {
          getFunction.call(this.platform.getFunctions, subscription.characteristic, subscription.service, null, change);
        }
      }
    });
  }
}
