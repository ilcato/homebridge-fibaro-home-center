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
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

declare const Buffer;

export class FibaroClient {

	url: string;
	host: string;
	auth: string;
	headers: any;
	ca: any;
	status: boolean;

	constructor(url, host, username, password, log) {
		this.url = url;
		this.host = host;
		this.auth = "Basic " + new Buffer.from(username + ":" + password).toString("base64");
		this.headers = {
			"Authorization": this.auth
		};
		let configPath = '/homebridge';
		try {
			this.ca = fs.readFileSync(configPath + '/ca.cer');
		} catch (e) {
			if (e.code === 'ENOENT') {
				let configPath = process.env.UIX_CONFIG_PATH
				if (configPath) {
					configPath = configPath.substring(0, configPath.lastIndexOf("/config.json"))
				} else {
					configPath = path.resolve(os.homedir(), '.homebridge');
				}
				try {
					this.ca = fs.readFileSync(configPath + '/ca.cer');
				} catch (e) {
					log("Error reading ca.cer: ", e);
				}
			} else {
				log("Error reading ca.cer: ", e);
			}
		}
		if (this.url && !this.ca) {
			log("Put a valid ca.cer file in config.json folder.");
			this.status = false;
		} else {
			this.status = true;
		}
	}
	composeURL(service) {
		if (this.url)
			return this.url + service;
		else
			return "http://" + this.host + service;
	}
	genericGet(service) {
		const url = this.composeURL(service);

		return superagent
			.get(url)
			.set('Authorization', this.auth)
			.set('accept', 'json')
			.ca(this.ca);
	}
	genericPost(service, body) {
		const url = this.composeURL(service);
		return superagent
			.post(url)
			.send(body)
			.set('Authorization', this.auth)
			.set('accept', 'json')
			.ca(this.ca);
	}
	genericPut(service, body) {
		const url = this.composeURL(service);
		return superagent
			.put(url)
			.send(body)
			.set('Authorization', this.auth)
			.set('accept', 'json')
			.ca(this.ca);
	}

	getScenes() {
		return this.genericGet('/api/scenes');
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
			"args": param,
			"delay": 0
		} : {};
		return this.genericPost('/api/devices/' + ID + '/action/' + action, body)
	}
	executeScene(ID) {
		const body = {};
		return this.genericPost('/api/scenes/' + ID + '/execute', body)
	}
	getGlobalVariable(globalVariableID) {
		return this.genericGet('/api/globalVariables/' + globalVariableID);
	}
	setGlobalVariable(globalVariableID, value) {
		const body = value !== null ? {
			"value": value,
			"invokeScenes": true
		} : null;
		return this.genericPut('/api/globalVariables/' + globalVariableID, body)
	}
}
