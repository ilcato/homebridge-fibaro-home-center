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

// Fibaro rest api client

'use strict';

import superagent = require('superagent');
import Throttle = require('superagent-throttle');
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

declare const Buffer;

// fix HC2 - 503-error (devices > 100)
const throttle = new Throttle({
  active: true,
  rate: 1000,
  ratePer: 3000,
  concurrent: 50, // how many requests can be sent concurrently
});

export class FibaroClient {

  url: string;
  host: string;
  auth: string;
  headers: unknown;
  ca: unknown;
  status: boolean;

  constructor(url, host, username, password, log) {
    this.url = url;
    this.host = host;
    this.auth = 'Basic ' + new Buffer.from(username + ':' + password).toString('base64');
    this.headers = {
      'Authorization': this.auth,
    };

    if (this.url) {
      const configPath = '/homebridge';
      try {
        this.ca = fs.readFileSync(configPath + '/ca.cer');
      } catch (e) {
        if (e.code === 'ENOENT') {
          let configPath = process.env.UIX_CONFIG_PATH;
          if (configPath) {
            configPath = configPath.substring(0, configPath.lastIndexOf('/config.json'));
          } else {
            configPath = path.resolve(os.homedir(), '.homebridge');
          }
          try {
            this.ca = fs.readFileSync(configPath + '/ca.cer');
          } catch (e) {
            if (e.code !== 'ENOENT') {
              log('Error reading ca.cer: ', e);
            } else {
              log('Cannot find ca.cer in: ', configPath);
            }
          }
        } else {
          log('Error reading ca.cer: ', e);
        }
      }
    }
    if (this.url && !this.ca) {
      log('Put a valid ca.cer file in config.json folder.');
      this.status = false;
    } else {
      this.status = true;
    }
  }

  composeURL(service) {
    if (this.url) {
      return this.url + service;
    } else {
      return 'http://' + this.host + service;
    }
  }

  async genericGet(service) {
    const url = this.composeURL(service);
    return superagent
      .get(url)
      .use(throttle.plugin())
      .set('Authorization', this.auth)
      .set('accept', 'json')
      .ca(this.ca);
  }

  genericPost(service, body) {
    const url = this.composeURL(service);
    return superagent
      .post(url)
      .use(throttle.plugin())
      .send(body)
      .set('Authorization', this.auth)
      .set('accept', 'json')
      .ca(this.ca);
  }

  genericPut(service, body) {
    const url = this.composeURL(service);
    return superagent
      .put(url)
      .use(throttle.plugin())
      .send(body)
      .set('Authorization', this.auth)
      .set('accept', 'json')
      .ca(this.ca);
  }

  getInfo() {
    return this.genericGet('/api/settings/info');
  }

  getScenes() {
    return this.genericGet('/api/scenes');
  }

  getClimateZones() {
    return this.genericGet('/api/panels/climate?detailed=false');
  }

  getClimateZone(ID) {
    return this.genericGet('/api/panels/climate/' + ID);
  }

  getHeatingZones() {
    return this.genericGet('/api/panels/heating');
  }

  getHeatingZone(ID) {
    return this.genericGet('/api/panels/heating/' + ID);
  }

  setClimateZoneHandTemperature(ID, mode, temperature, timestamp) {
    const body = {
      'properties': {
        'handMode': mode,
        'handTimestamp': timestamp,
      },
    };
    switch (mode) {
      case 'Heat':
        body.properties['handSetPointHeating'] = temperature;
        break;
      case 'Cool':
        body.properties['handSetPointCooling'] = temperature;
        break;
    }
    return this.genericPut('/api/panels/climate/' + ID, body);
  }

  setHeatingZoneHandTemperature(ID, temperature, timestamp) {
    const body = {
      'properties': {
        'handTemperature': temperature,
        'handTimestamp': timestamp,
      },
    };
    return this.genericPut('/api/panels/heating/' + ID, body);
  }

  getRooms() {
    return this.genericGet('/api/rooms');
  }

  getDevices() {
    return this.genericGet('/api/devices');
  }

  getDeviceProperties(ID) {
    return this.genericGet('/api/devices/' + ID);
  }

  refreshStates(lastPoll) {
    return this.genericGet('/api/refreshStates?last=' + lastPoll);
  }

  executeDeviceAction(ID, action, param) {
    const body = param !== null ? {
      'args': param,
      'delay': 0,
    } : {};
    return this.genericPost('/api/devices/' + ID + '/action/' + action, body);
  }

  executeScene(ID, useOldApi) {
    const body = {};
    return this.genericPost('/api/scenes/' + ID + (useOldApi ? '/action/start' : '/execute'), body);
  }

  getGlobalVariable(globalVariableID) {
    return this.genericGet('/api/globalVariables/' + globalVariableID);
  }

  setGlobalVariable(globalVariableID, value) {
    const body = value !== null ? {
      'value': value,
      'invokeScenes': true,
    } : null;
    return this.genericPut('/api/globalVariables/' + globalVariableID, body);
  }
}
