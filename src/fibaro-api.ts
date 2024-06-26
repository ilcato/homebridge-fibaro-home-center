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

// Fibaro rest api client

'use strict';

import superagent = require('superagent');
import Throttle = require('superagent-throttle');
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as constants from './constants';


declare const Buffer;

// fix HC2 - 503-error (devices > 100)
const throttle = new Throttle({
  active: true,
  rate: 1000,
  ratePer: 3000,
  concurrent: 50, // how many requests can be sent concurrently
});

export class FibaroClient {

  baseUrl: string;
  auth: string;
  adminAuth : string;
  https: boolean;
  ca: unknown;
  status: boolean;

  constructor(baseUrl, username, password, log, adminUsername, adminPassword) {
    this.baseUrl = baseUrl;
    this.auth = 'Basic ' + new Buffer.from(username + ':' + password).toString('base64');
    if (adminUsername) {
      this.adminAuth = 'Basic ' + new Buffer(adminUsername + ':' + adminPassword).toString('base64');
    } else {
      this.adminAuth = '';
    }
    this.https = (this.baseUrl) ? this.baseUrl.indexOf('https:') !== -1 : false;
    this.ca = null;

    if (this.baseUrl && this.https) {

      const localConfigPath = '/homebridge';
      const localFile = localConfigPath + '/ca.cer';
      // Check that the file exists locally
      if(fs.existsSync(localFile)) {
        try {
          this.ca = fs.readFileSync(localFile);
        } catch (e) {
          log('Error reading ca.cer from /homebridge: ', e);
        }
      } else {
        // Check if the file exists in the config.json folder
        let configPath = process.env.UIX_CONFIG_PATH;
        if (configPath) {
          configPath = configPath.substring(0, configPath.lastIndexOf('/config.json'));
        } else {
          configPath = path.resolve(os.homedir(), '.homebridge');
        }
        const file = configPath + '/ca.cer';
        if(fs.existsSync(file)) {
          try {
            this.ca = fs.readFileSync(file);
          } catch (e) {
            log('Error reading ca.cer from config.json folder: ', e);
          }
        }
      }
    }
    if (this.baseUrl && this.https && !this.ca) {
      log('Put a valid ca.cer file in config.json folder.');
      this.status = false;
    } else {
      this.status = true;
    }
  }

  composeURL(service) {
    return this.baseUrl + service;
  }

  async genericGet(service) {
    const url = this.composeURL(service);
    if (this.https) {
      return superagent
        .get(url)
        .use(throttle.plugin())
        .set('Authorization', this.auth)
        .set('accept', 'json')
        .ca(this.ca);
    } else {
      return superagent
        .get(url)
        .use(throttle.plugin())
        .set('Authorization', this.auth)
        .set('accept', 'json');
    }
  }

  genericPost(service, body) {
    const url = this.composeURL(service);
    if (this.https) {
      return superagent
        .post(url)
        .use(throttle.plugin())
        .send(body)
        .set('Authorization', this.auth)
        .set('accept', 'json')
        .ca(this.ca);
    } else {
      return superagent
        .post(url)
        .use(throttle.plugin())
        .send(body)
        .set('Authorization', this.auth)
        .set('accept', 'json');
    }
  }

  genericPut(service, body) {
    const url = this.composeURL(service);
    if (this.https) {
      return superagent
        .put(url)
        .use(throttle.plugin())
        .send(body)
        .set('Authorization', this.auth)
        .set('accept', 'json')
        .ca(this.ca);
    } else {
      return superagent
        .put(url)
        .use(throttle.plugin())
        .send(body)
        .set('Authorization', this.auth)
        .set('accept', 'json');
    }
  }

  genericAdminPut(service, body) {
    const url = this.composeURL(service);
    if (this.https) {
      return superagent
        .put(url)
        .use(throttle.plugin())
        .send(body)
        .set('Authorization', this.adminAuth)
        .set('accept', 'json')
        .ca(this.ca);
    } else {
      return superagent
        .put(url)
        .use(throttle.plugin())
        .send(body)
        .set('Authorization', this.adminAuth)
        .set('accept', 'json');
    }
  }

  getInfo() {
    return this.genericGet(constants.API_URL_INFO);
  }

  getScenes() {
    return this.genericGet(constants.API_URL_SCENES);
  }

  getClimateZones() {
    return this.genericGet(constants.API_URL_CLIMATE + '?detailed=false');
  }

  getClimateZone(ID) {
    return this.genericGet(constants.API_URL_CLIMATE + '/' + ID);
  }

  getHeatingZones() {
    return this.genericGet(constants.API_URL_HEATING);
  }

  getHeatingZone(ID) {
    return this.genericGet(constants.API_URL_HEATING + '/' + ID);
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
    return this.genericPut(constants.API_URL_CLIMATE + '/' + ID, body);
  }

  setHeatingZoneHandTemperature(ID, temperature, timestamp) {
    const body = {
      'properties': {
        'handTemperature': temperature,
        'handTimestamp': timestamp,
      },
    };
    return this.genericPut(constants.API_URL_HEATING + '/' + ID, body);
  }

  getRooms() {
    return this.genericGet(constants.API_URL_ROOMS);
  }

  getDevices() {
    return this.genericGet(constants.API_URL_DEVICES);
  }

  getDeviceProperties(ID) {
    return this.genericGet(constants.API_URL_DEVICES + '/' + ID);
  }

  refreshStates(lastPoll) {
    return this.genericGet(constants.API_URL_REFRESH_STATES + '?last=' + lastPoll);
  }

  executeDeviceAction(ID, action, param) {
    const body = param !== null ? {
      'args': param,
      'delay': 0,
    } : {};
    return this.genericPost(constants.API_URL_DEVICES + '/' + ID + '/action/' + action, body);
  }

  executeScene(ID, useOldApi) {
    const body = {};
    return this.genericPost(constants.API_URL_SCENES + '/' + ID + (useOldApi ? '/action/start' : '/execute'), body);
  }

  getGlobalVariable(globalVariableID) {
    return this.genericGet(constants.API_URL_GLOBAL_VARIABLES + '/' + globalVariableID);
  }

  setGlobalVariable(globalVariableID, value) {
    const body = value !== null ? {
      'value': value,
      'invokeScenes': true,
    } : null;
    return this.genericAdminPut(constants.API_URL_GLOBAL_VARIABLES + '/' + globalVariableID, body);
  }
}
