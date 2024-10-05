// fibaro-api.ts

import superagent from 'superagent';
import Throttle from 'superagent-throttle';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as constants from './constants';

declare const Buffer;

// Throttle for GET requests
// fix HC2 - 503-error (devices > 100)
const getThrottle = new Throttle({
  active: true,
  rate: constants.DEFAULT_THROTTLE_RATE,
  ratePer: constants.DEFAULT_THROTTLE_RATE_PER,
  concurrent: constants.DEFAULT_THROTTLE_CONCURRENT,
});

// Throttle for PUT and POST requests
// sequentialize PUT and POST requests
const putPostThrottle = new Throttle({
  active: true,
  rate: 3,
  ratePer: 500,
  concurrent: 3, // Set to 1 for sequential processing
});

export class FibaroClient {
  private baseUrl: string;
  private auth: string;
  private adminAuth: string;
  private https: boolean;
  private ca: Buffer | null;
  public status: boolean;

  constructor(
    baseUrl: string,
    username: string,
    password: string,
    log: (message: string, error?: Error) => void,
    adminUsername?: string,
    adminPassword?: string,
  ) {
    this.baseUrl = baseUrl;
    this.auth = this.createAuthString(username, password);
    this.adminAuth = adminUsername ? this.createAuthString(adminUsername, adminPassword!) : '';
    this.https = baseUrl?.includes('https:') ?? false;
    this.ca = this.loadCertificate(log);
    this.status = this.https && !this.ca ? false : true;

    if (this.https && !this.ca) {
      log('Put a valid ca.cer file in config.json folder.');
    }
  }

  private createAuthString(username: string, password: string): string {
    return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  }

  private loadCertificate(log: (message: string, error?: Error) => void): Buffer | null {
    if (!this.baseUrl || !this.https) {
      return null;
    }

    const certPaths = [
      ...constants.CERTIFICATE_PATHS,
      path.resolve(
        process.env.UIX_CONFIG_PATH?.replace(/\/config\.json$/, '') || path.join(os.homedir(), '.homebridge'),
        constants.CERTIFICATE_FILE_NAME,
      ),
    ];

    for (const certPath of certPaths) {
      try {
        if (fs.existsSync(certPath)) {
          return fs.readFileSync(certPath);
        }
      } catch (e) {
        log(`Error reading ${constants.CERTIFICATE_FILE_NAME} from ${certPath}:`, e as Error);
      }
    }

    return null;
  }

  composeURL(service) {
    return this.baseUrl + service;
  }

  async genericGet(service) {
    const url = this.composeURL(service);
    let request = superagent
      .get(url)
      .use(getThrottle.plugin())
      .set('Authorization', this.auth)
      .set('accept', constants.HTTP_ACCEPT_HEADER);

    if (this.https) {
      request = request.ca(this.ca as Buffer);
    }

    return request;
  }

  genericPost(service, body) {
    const url = this.composeURL(service);
    let request = superagent
      .post(url)
      .use(getThrottle.plugin())
      .send(body)
      .set('Authorization', this.auth)
      .set('accept', constants.HTTP_ACCEPT_HEADER);

    if (this.https) {
      request = request.ca(this.ca as Buffer);
    }

    return request;
  }

  genericPut(service, body) {
    const url = this.composeURL(service);
    let request = superagent
      .put(url)
      .use(putPostThrottle.plugin())
      .send(body)
      .set('Authorization', this.auth)
      .set('accept', constants.HTTP_ACCEPT_HEADER);

    if (this.https) {
      request = request.ca(this.ca as Buffer);
    }

    return request;
  }

  genericAdminPut(service, body) {
    const url = this.composeURL(service);
    let request = superagent
      .put(url)
      .use(putPostThrottle.plugin())
      .send(body)
      .set('Authorization', this.adminAuth)
      .set('accept', constants.HTTP_ACCEPT_HEADER);

    if (this.https) {
      request = request.ca(this.ca as Buffer);
    }

    return request;
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
