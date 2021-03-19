//    Copyright 2020 ilcato
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

// Fibaro Home Center 3 Platform plugin for HomeBridge
//
// Remember to add platform to config.json. Example:
// "platforms": [
//     {
//            "platform": "FibaroHC3",
//            "name": "FibaroHC3",
//            "url": "PUT URL OF YOUR HC3 HERE",
//            "host": "PUT IP ADDRESS OF YOUR HC3 HERE",
//            "username": "PUT USERNAME OF YOUR HC3 HERE",
//            "password": "PUT PASSWORD OF YOUR HC3 HERE",
//            "pollerperiod": "PUT 0 FOR DISABLING POLLING, 1 - 100 INTERVAL IN SECONDS. 5 SECONDS IS THE DEFAULT",
//						"thermostattimeout": "PUT THE NUMBER OF SECONDS FOR THE THERMOSTAT TIMEOUT, DEFAULT: 7200 (2 HOURS). PUT 0 FOR INFINITE",
//						"enablecoolingstatemanagemnt": "PUT on TO AUTOMATICALLY MANAGE HEATING STATE FOR THERMOSTAT, off TO DISABLE IT. DEFAULT off",
//						"switchglobalvariables": "PUT A COMMA SEPARATED LIST OF HOME CENTER GLOBAL VARIABLES ACTING LIKE A BISTABLE SWITCH",
//						"securitysystem": "PUT enabled OR disabled IN ORDER TO MANAGE THE AVAILABILITY OF THE SECURITY SYSTEM",
//     }
// ],
//
// When you attempt to add a device, it will ask for a "PIN code".
// The default code for all HomeBridge accessories is 031-45-154.

'use strict'

import { FibaroClient } from './fibaro-api'
import {
	pluginName,
	platformName,
	ShadowAccessory
} from './shadows'
import { SetFunctions } from './setFunctions'
import { GetFunctions } from './getFunctions'
import { Poller } from './pollerupdate'

const defaultPollerPeriod = 5;
const timeOffset = 2 * 3600;
const defaultEnableCoolingStateManagemnt = "off";


let Accessory,
	Service,
	HapStatusError,
	HAPStatus,
	Characteristic,
	UUIDGen;

export = function (homebridge) {
	Accessory = homebridge.platformAccessory
	Service = homebridge.hap.Service
	HapStatusError = homebridge.hap.HapStatusError
	HAPStatus = homebridge.hap.HAPStatus;
	Characteristic = homebridge.hap.Characteristic
	UUIDGen = homebridge.hap.uuid
	homebridge.registerPlatform(pluginName, platformName, FibaroHC3, true)
}

class Config {
	name: string;
	url: string;
	host: string;
	username: string;
	password: string;
	pollerperiod?: string;
	thermostattimeout?: string;
	enablecoolingstatemanagemnt?: string;
	switchglobalvariables?: string;
	securitysystem?: string;
	FibaroTemperatureUnit?: string;
	addRoomNameToDeviceName?: string;
	constructor() {
		this.name = "";
		this.url = "";
		this.host = "";
		this.username = "";
		this.password = "";
	}
}

class FibaroHC3 {
	log: (format: string, message: any) => void;
	config: Config;
	api: any;
	accessories: Map<string, any>;
	updateSubscriptions: Array<Object>;
	poller?: Poller;
	scenes: Object;
	securitySystemService: Object;
	fibaroClient?: FibaroClient;
	setFunctions?: SetFunctions;
	getFunctions?: GetFunctions;

	constructor(log: (format: string, message: any) => void, config: Config, api: any) {
		this.log = log;
		this.api = api;

		this.accessories = new Map();
		this.updateSubscriptions = new Array();
		this.scenes = {};
		this.securitySystemService = {};

		this.config = config;

		if (!config) {
			this.log('Fibaro HC3 configuration:', 'cannot find configuration for the plugin');
			return;
		}
		let pollerPeriod = this.config.pollerperiod ? parseInt(this.config.pollerperiod) : defaultPollerPeriod;
		if (isNaN(pollerPeriod) || pollerPeriod < 0 || pollerPeriod > 100)
			pollerPeriod = defaultPollerPeriod;
		if (this.config.thermostattimeout == undefined)
			this.config.thermostattimeout = timeOffset.toString();
		if (this.config.enablecoolingstatemanagemnt == undefined)
			this.config.enablecoolingstatemanagemnt = defaultEnableCoolingStateManagemnt;
		if (this.config.switchglobalvariables == undefined)
			this.config.switchglobalvariables = "";
		if (this.config.securitysystem == undefined || (this.config.securitysystem != "enabled" && this.config.securitysystem != "disabled"))
			this.config.securitysystem = "disabled";
		if (this.config.FibaroTemperatureUnit == undefined)
			this.config.FibaroTemperatureUnit = "C";
		if (this.config.addRoomNameToDeviceName == undefined)
			this.config.addRoomNameToDeviceName = "disabled";
		this.fibaroClient = new FibaroClient(this.config.url, this.config.host, this.config.username, this.config.password, this.log);
		if (this.fibaroClient.status == false) {
			this.log('Cannot connect to Fibaro Home Center', 'Check credentials, url/host or ca.cer file');
			return;
		}
		if (pollerPeriod != 0)
			this.poller = new Poller(this, pollerPeriod, Service, Characteristic);
		this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));

		this.getFunctions = new GetFunctions(Characteristic, this);
	}
	async didFinishLaunching() {
		this.log('didFinishLaunching.', '');
		if (!this.fibaroClient)
			return;

		try {
			const scenes = (await this.fibaroClient.getScenes()).body;
			scenes.map((s) => {
				this.scenes[s.name] = s.id;
			});
			this.setFunctions = new SetFunctions(Characteristic, this);	// There's a dependency in setFunction to Scene Mapping
			const devices = this.fibaroClient ? (await this.fibaroClient.getDevices()).body : {};
			let rooms = null
			if (this.config.addRoomNameToDeviceName == "enabled" && this.fibaroClient) {
				rooms = (await this.fibaroClient.getRooms()).body
			}
			this.LoadAccessories(devices, rooms);
		} catch (e) {
			this.log("Error getting data from Home Center: ", e);
			throw e;
		}
	}
	configureAccessory(accessory) {
		for (let s = 0; s < accessory.services.length; s++) {
			let service = accessory.services[s];
			if (service.subtype != undefined) {
				let subtypeParams = service.subtype.split("-"); // DEVICE_ID-VIRTUAL_BUTTON_ID-RGB_MARKER-OPERATING_MODE_ID-FLOAT_SVC_ID
				if (subtypeParams.length >= 3 && subtypeParams[2] == "RGB") {
					// For RGB devices add specific attributes for managing it
					service.HSBValue = { hue: 0, saturation: 0, brightness: 0 };
					service.RGBValue = { red: 0, green: 0, blue: 0 };
					service.countColorCharacteristics = 2;
					service.timeoutIdColorCharacteristics = 0;
				}
				if (subtypeParams.length >= 4) {
					service.operatingModeId = subtypeParams[3];
				}
				if (subtypeParams.length >= 5) {
					service.floatServiceId = subtypeParams[4];
				}
			}
			for (let i = 0; i < service.characteristics.length; i++) {
				let characteristic = service.characteristics[i];
				this.bindCharacteristicEvents(characteristic, service, accessory);
			}
		}
		this.log("Configured Accessory: ", accessory.displayName);
		this.accessories.set(accessory.context.uniqueSeed, accessory);
		accessory.reachable = true;
	}
	LoadAccessories(devices, rooms) {
		this.log('Loading accessories', '');
		devices.map((s, i, a) => {
			if (s.visible == true && s.name.charAt(0) != "_") {
				let siblings = this.findSiblingDevices(s, a);
				if (rooms != null) {
					// patch device name
					let room = rooms.find(r => r.id === s.roomID);
					s.name = s.name + " - " + (room != null ? room.name : "no-room");
				}
				this.addAccessory(ShadowAccessory.createShadowAccessory(s, siblings, Accessory, Service, Characteristic, this));
			}
		});

		// Create Global Variable Switches
		if (this.config.switchglobalvariables && this.config.switchglobalvariables != "") {
			let globalVariables = this.config.switchglobalvariables.split(',');
			for (let i = 0; i < globalVariables.length; i++) {
				let device = { name: globalVariables[i], roomID: 0, id: 0 };
				let sa = ShadowAccessory.createShadowGlobalVariableSwitchAccessory(device, Accessory, Service, Characteristic, this);
				this.addAccessory(sa);
			}
		}

		// Create Security System accessory
		if (this.config.securitysystem == "enabled") {
			let device = { name: "FibaroSecuritySystem", roomID: 0, id: 0 };
			let sa = ShadowAccessory.createShadowSecuritySystemAccessory(device, Accessory, Service, Characteristic, this);
			this.addAccessory(sa);
		}

		// Remove not reviewd accessories: cached accessories no more present in Home Center
		let accessories = this.accessories.values() // Iterator for accessories, key is the uniqueseed
		for (let a of accessories) {
			if (!a.reviewed) {
				this.removeAccessory(a);
			}
		}
		// Start the poller update mechanism
		if (this.poller)
			this.poller.poll();
	}

	addAccessory(shadowAccessory) {
		if (shadowAccessory == undefined)
			return;
		let uniqueSeed = shadowAccessory.name + shadowAccessory.roomID;
		let isNewAccessory = false;
		let a: any = this.accessories.get(uniqueSeed);
		if (a == null) {
			isNewAccessory = true;
			let uuid = UUIDGen.generate(uniqueSeed);
			a = new Accessory(shadowAccessory.name, uuid); // Create the HAP accessory
			a.context.uniqueSeed = uniqueSeed;
			this.accessories.set(uniqueSeed, a);
		}
		// Store SecuritySystem Accessory
		if (this.config.securitysystem == "enabled" && shadowAccessory.isSecuritySystem) {
			this.securitySystemService = a.getService(Service.SecuritySystem);
		}
		shadowAccessory.setAccessory(a);
		// init accessory
		shadowAccessory.initAccessory();
		// Remove services existing in HomeKit, device no more present in Home Center
		shadowAccessory.removeNoMoreExistingServices();
		// Add services present in Home Center and not existing in Homekit accessory
		shadowAccessory.addNewServices(this);
		// Register or update platform accessory
		shadowAccessory.registerUpdateAccessory(isNewAccessory, this.api);
		this.log("Added/changed accessory: ", shadowAccessory.name);
	}

	removeAccessory(accessory) {
		this.log('Remove accessory', accessory.displayName);
		this.api.unregisterPlatformAccessories(pluginName, platformName, [accessory]);
		this.accessories.delete(accessory.context.uniqueSeed);
	}

	bindCharacteristicEvents(characteristic, service, accessory) {
		if (service.subtype == undefined) return;
		let IDs = service.subtype.split("-"); // IDs[0] is always device ID; for virtual device IDs[1] is the button ID
		service.isVirtual = IDs[1] != "" ? true : false;
		service.isSecuritySystem = IDs[0] == "0" ? true : false;
		service.isGlobalVariableSwitch = IDs[0] == "G" ? true : false;
		service.isHarmonyDevice = (IDs.length >= 4 && IDs[4] == "HP") ? true : false;
		service.isLockSwitch = (IDs.length >= 4 && IDs[4] == "LOCK") ? true : false;

		if (!service.isVirtual) {
			var propertyChanged = "value"; // subscribe to the changes of this property
			if (service.HSBValue != undefined)
				propertyChanged = "color";
			if (service.operatingModeId != undefined) {
				if (characteristic.UUID == (new Characteristic.CurrentHeatingCoolingState()).UUID || characteristic.UUID == (new Characteristic.TargetHeatingCoolingState()).UUID) {
					propertyChanged = "mode";
				}
			}
			if (service.UUID == (Service.WindowCovering.UUID) && (characteristic.UUID == (new Characteristic.CurrentHorizontalTiltAngle).UUID)) {
				propertyChanged = "value2";
			}
			if (service.UUID == (Service.WindowCovering.UUID) && (characteristic.UUID == (new Characteristic.TargetHorizontalTiltAngle).UUID)) {
				propertyChanged = "value2";
			}
			this.subscribeUpdate(service, characteristic, propertyChanged);
		}
		characteristic.on('set', (value, callback, context) => {
			this.setCharacteristicValue(value, callback, context, characteristic, service, IDs);
		});
		characteristic.on('get', (callback) => {
			if (characteristic.UUID == (new Characteristic.Name()).UUID) {
				callback(undefined, characteristic.value);
				return;
			}
			if (service.isVirtual && !service.isGlobalVariableSwitch) {
				// a push button is normally off
				callback(undefined, false);
			} else {
				this.getCharacteristicValue(callback, characteristic, service, accessory, IDs);
			}
		});
	}

	setCharacteristicValue(value, callback, context, characteristic, service, IDs) {
		if (context !== 'fromFibaro' && context !== 'fromSetValue') {
			let d = IDs[0] != "G" ? IDs[0] : IDs[1];
			this.log("Setting value to device: ", `${d}  parameter: ${characteristic.displayName}`);
			if (this.setFunctions) {
				let setFunction = this.setFunctions.setFunctionsMapping.get(characteristic.UUID);
				if (setFunction)
					setFunction.call(this.setFunctions, value, callback, context, characteristic, service, IDs);
			}
		}
	}

	async getCharacteristicValue(callback, characteristic, service, accessory, IDs) {
		this.log("Getting value from device: ", `${IDs[0]}  parameter: ${characteristic.displayName}`);
		try {
			if (!this.fibaroClient) {
				this.log("Error:", "no Fibaro client available.");
				callback(undefined, characteristic.value);
				return;
			}
			// Manage security system status
			if (service.isSecuritySystem) {
				const securitySystemStatus = (await this.fibaroClient.getGlobalVariable("SecuritySystem")).body;
				if (this.getFunctions)
					this.getFunctions.getSecuritySystemState(null, characteristic, service, IDs, securitySystemStatus);
				callback(undefined, characteristic.value);
				return;
			}
			// Manage global variable switches
			if (service.isGlobalVariableSwitch) {
				const switchStatus = (await this.fibaroClient.getGlobalVariable(IDs[1])).body;
				if (this.getFunctions)
					this.getFunctions.getBool(null, characteristic, service, IDs, switchStatus);
				callback(undefined, characteristic.value);
				return;
			}
		} catch (e) {
			this.log("There was a problem getting value from Global Variables", ` - Err: ${e}`);
			callback(undefined, characteristic.value);
			return;
		}
		// Manage all other status
		if (!this.getFunctions) {
			callback(undefined, characteristic.value);
			return;
		}

		let getFunction = this.getFunctions.getFunctionsMapping.get(characteristic.UUID);
		if (getFunction) {
			setTimeout(async () => {
				if (!this.fibaroClient) return;
				try {
					let properties: any;
					properties = (await this.fibaroClient.getDeviceProperties(IDs[0])).body.properties;
					if (getFunction.function) {
						if (this.config.FibaroTemperatureUnit == "F") {
							if (characteristic.displayName == 'Current Temperature') {
								properties.value = (properties.value - 32) * 5 / 9;
							}
						}
						if (properties.hasOwnProperty('dead') && properties.dead == 'true') {
							service.dead = true;
							this.log("Device dead: ", `${IDs[0]}  parameter: ${characteristic.displayName}`);
						} else {
							service.dead = false;
							getFunction.function.call(this.getFunctions, null, characteristic, service, IDs, properties);
						}
					} else {
						this.log("No get function defined for: ", `${characteristic.displayName}`);
					}
				} catch (e) {
					this.log("G1 - There was a problem getting value from: ", `${IDs[0]} - Err: ${e}`);
				}
			}, getFunction.delay * 100);
		}
		if (service.dead) {
			callback(new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE));
		} else {
			callback(undefined, characteristic.value);
		}
	}

	subscribeUpdate(service, characteristic, propertyChanged) {
		var IDs = service.subtype.split("-"); 							// IDs[0] is always device ID; for virtual device IDs[1] is the button ID
		this.updateSubscriptions.push({ 'id': IDs[0], 'service': service, 'characteristic': characteristic, "property": propertyChanged });
	}

	findSiblingDevices(device, devices) {
		let siblings = new Map<string, object>();

		devices.map((s, i, a) => {
			if (s.visible == true && s.name.charAt(0) != "_") {
				if (device.parentId == s.parentId && device.id != s.id) {
					siblings.set(s.type, s);
				}
			}
		});

		return siblings;
	}
}

