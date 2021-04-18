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

export class Poller {

	platform;
	pollingUpdateRunning: boolean;
	lastPoll: number;
	pollerPeriod: number;
	timeout;

	constructor(platform, pollerPeriod) {
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
	    const updates = (await this.platform.fibaroClient.refreshStates(this.lastPoll)).body;
	    if (updates.last !== undefined) {
	      this.lastPoll = updates.last;
	    }
	    if (updates.changes !== undefined) {
	      updates.changes.map((change) => {
	        if ((change.value !== undefined) || (change.value2 !== undefined)) {
	          this.manageValue(change);
	        } else if (change['ui.startStopActivitySwitch.value'] !== undefined) {
	          change.value = change['ui.startStopActivitySwitch.value'];
	          this.manageValue(change);
	        } else if (change.color !== undefined) {
	          this.manageColor(change);
	        } else if (change.thermostatMode !== undefined) {
	          this.manageOperatingMode(change);
	        } else if (change.heatingThermostatSetpoint !== undefined) {
	          this.manageHeatingThermostatSetpoint(change);
	        }
	      });
	    }
	    // Manage global variable switches and dimmers
	    await this.manageGlobalVariableDevice(this.platform.config.switchglobalvariables, 'G');
	    await this.manageGlobalVariableDevice(this.platform.config.dimmerglobalvariables, 'D');

	    // Manage Security System state
	    if (this.platform.config.securitysystem === 'enabled') {
	      await this.manageSecuritySystem();
	    }

	  } catch (e) {
	    this.platform.log.error('Error fetching updates: ', e);
	    if (e === 400) {
	      this.lastPoll = 0;
	    }
	  } finally {
	    this.pollingUpdateRunning = false;
	    this.restartPoll(this.pollerPeriod * 1000);
	    this.platform.log.debug('Restarting poller...');
	  }
	}

	restartPoll(delay) {
	  this.timeout = setTimeout( () => {
	    this.poll();
	  }, delay);
	}

	cancelPoll() {
	  clearTimeout(this.timeout);
	}

	manageValue(change) {
	  for (let i = 0; i < this.platform.updateSubscriptions.length; i++) {
	    const subscription = this.platform.updateSubscriptions[i];
	    if (!(subscription.service instanceof this.platform.Service.BatteryService) && subscription.characteristic.displayName !== 'Name') {

	      const property = subscription.property;
	      const id = parseInt(subscription.id);
	      if (id === change.id &&
					((property === 'value' && change.value !== undefined) || (property === 'value2' && change.value2 !== undefined))) {
	        if (this.platform.config.FibaroTemperatureUnit === 'F') {
	          if (subscription.characteristic.displayName === 'Current Temperature') {
	            change.value = (change.value - 32) * 5 / 9;
	          }
	        }
	        const changePropertyValue = change[property];
	        this.platform.log.info(`Updating ${property} for device: `,
	          `${subscription.id}  parameter: ${subscription.characteristic.displayName}, ${property}: ${changePropertyValue}`);
	        const getFunction = this.platform.getFunctions.getFunctionsMapping.get(subscription.characteristic.UUID);
	        if (getFunction && getFunction.function) {
	          getFunction.function.call(this.platform.getFunctions, subscription.characteristic, subscription.service, null, change);
	        }
	      }
	    }
	  }
	}

	async manageGlobalVariableDevice(param, type) {
	  if (param !== '') {
	    const globalVariables = param.split(',');
	    for (let i = 0; i < globalVariables.length; i++) {
	      const value = (await this.platform.fibaroClient.getGlobalVariable(globalVariables[i])).body;
	      let s, c;
	      switch (type) {
	        case 'G':
	          s = this.platform.findServiceByName(globalVariables[i], this.platform.Service.Switch);
	          c = s.getCharacteristic(this.platform.Characteristic.On);
	          this.platform.getFunctions.getBool(c, null, null, value);
	          break;
	        case 'D':
	          s = this.platform.findServiceByName(globalVariables[i], this.platform.Service.Lightbulb);
	          c = s.getCharacteristic(this.platform.Characteristic.On);
	          this.platform.getFunctions.getBool(c, null, null, value);
	          c = s.getCharacteristic(this.platform.Characteristic.Brightness);
	          this.platform.getFunctions.getBrightness(c, null, null, value);
	          break;
	        default:
	          break;
	      }
	    }
	  }
	}

	async manageSecuritySystem() {
	  const securitySystemStatus = (await this.platform.fibaroClient.getGlobalVariable('SecuritySystem')).body;

	  const s = this.platform.findServiceByName('FibaroSecuritySystem', this.platform.Service.SecuritySystem);

	  if (s !== undefined) {
	    const statec = this.platform.getFunctions.getCurrentSecuritySystemStateMapping.get(securitySystemStatus.value);
	    if (statec !== undefined) {
	      const c = s.getCharacteristic(this.platform.Characteristic.SecuritySystemCurrentState);
	      if (c.value !== statec) {
	        c.updateValue(statec);
	      }
	    }
	  }
	}

	manageColor(change) {
	  for (let i = 0; i < this.platform.updateSubscriptions.length; i++) {
	    const subscription = this.platform.updateSubscriptions[i];
	    const id = parseInt(subscription.id);

	    if (id === change.id && subscription.property === 'color') {
	      const hsv = this.platform.getFunctions.updateHomeKitColorFromHomeCenter(change.color, subscription.service);
	      if (subscription.characteristic.UUID === (new this.platform.Characteristic.On()).UUID) {
	        subscription.characteristic.updateValue(hsv.v === 0 ? false : true);
	      } else if (subscription.characteristic.UUID === (new this.platform.Characteristic.Hue()).UUID) {
	        subscription.characteristic.updateValue(Math.round(hsv.h));
	      } else if (subscription.characteristic.UUID === (new this.platform.Characteristic.Saturation()).UUID) {
	        subscription.characteristic.updateValue(Math.round(hsv.s));
	      } else if (subscription.characteristic.UUID === (new this.platform.Characteristic.Brightness()).UUID) {
	        subscription.characteristic.updateValue(Math.round(hsv.v));
	      }
	    }
	  }
	}

	manageOperatingMode(change) {
	  for (let i = 0; i < this.platform.updateSubscriptions.length; i++) {
	    const subscription = this.platform.updateSubscriptions[i];
	    const id = parseInt(subscription.id);
	    if (id === change.id && subscription.property === 'mode') {
	      this.platform.log.info('Updating value for device: ',
	        `${subscription.id}  parameter: ${subscription.characteristic.displayName}, value: ${change.thermostatMode}`);
	      const getFunction = this.platform.getFunctions.getFunctionsMapping.get(subscription.characteristic.UUID);
	      if (getFunction.function) {
	        getFunction.function.call(this.platform.getFunctions, subscription.characteristic, subscription.service, null, change);
	      }
	    }
	  }
	}

	manageHeatingThermostatSetpoint(change) {
	  for (let i = 0; i < this.platform.updateSubscriptions.length; i++) {
	    const subscription = this.platform.updateSubscriptions[i];
	    const id = parseInt(subscription.id);
	    if (id === change.id && subscription.property === 'targettemperature') {
	      this.platform.log.info('Updating value for device: ',
	        `${subscription.id}  parameter: ${subscription.characteristic.displayName}, value: ${change.heatingThermostatSetpoint}`);
	      const getFunction = this.platform.getFunctions.getFunctionsMapping.get(subscription.characteristic.UUID);
	      if (getFunction.function) {
	        getFunction.function.call(this.platform.getFunctions, subscription.characteristic, subscription.service, null, change);
	      }
	    }
	  }
	}
}
