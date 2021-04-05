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

'use strict'

export const lowestTemp = 12;
export const stdTemp = 21;

export class SetFunctions {
	hapCharacteristic: any;
	setFunctionsMapping: Map<string, any>;
	getTargetSecuritySystemSceneMapping: Map<number, any>;

	platform: any;

	constructor(hapCharacteristic, platform) {
		this.hapCharacteristic = hapCharacteristic;
		this.platform = platform;

		this.setFunctionsMapping = new Map([
			[(new hapCharacteristic.On()).UUID, this.setOn],
			[(new hapCharacteristic.Brightness()).UUID, this.setBrightness],
			[(new hapCharacteristic.TargetPosition()).UUID, this.setTargetPosition],
			[(new hapCharacteristic.TargetHorizontalTiltAngle()).UUID, this.setTargetTiltAngle],
			[(new hapCharacteristic.LockTargetState()).UUID, this.setLockTargetState],
			[(new hapCharacteristic.TargetHeatingCoolingState()).UUID, this.setTargetHeatingCoolingState],
			[(new hapCharacteristic.TargetTemperature()).UUID, this.setTargetTemperature],
			[(new hapCharacteristic.TargetDoorState()).UUID, this.setTargetDoorState],
			[(new hapCharacteristic.Hue()).UUID, this.setHue],
			[(new hapCharacteristic.Saturation()).UUID, this.setSaturation],
			[(new hapCharacteristic.SecuritySystemTargetState()).UUID, this.setSecuritySystemTargetState],
		]);

		this.getTargetSecuritySystemSceneMapping = new Map([
			[this.hapCharacteristic.SecuritySystemTargetState.AWAY_ARM, this.platform.scenes.SetAwayArmed],
			[this.hapCharacteristic.SecuritySystemTargetState.DISARM, this.platform.scenes.SetDisarmed],
			[this.hapCharacteristic.SecuritySystemTargetState.NIGHT_ARM, this.platform.scenes.SetNightArmed],
			[this.hapCharacteristic.SecuritySystemTargetState.STAY_ARM, this.platform.scenes.SetStayArmed]
		]);

	}


	setOn(value, context, characteristic, service, IDs) {
		if (service.isVirtual && !service.isGlobalVariableSwitch && !service.isGlobalVariableDimmer) {
			// It's a virtual device so the command is pressButton and not turnOn or Off
			this.command("pressButton", [IDs[1]], service, IDs);
			// In order to behave like a push button reset the status to off
			setTimeout(() => {
				characteristic.setValue(0, undefined, 'fromSetValue');
			}, 100);
		} else if (service.isScene) {
			// It's a scene so the command is execute scene
			this.scene(IDs[0]);
			// In order to behave like a push button reset the status to off
			setTimeout(() => {
				characteristic.setValue(0, undefined, 'fromSetValue');
			}, 100);
		} else if (service.isGlobalVariableSwitch) {
			this.setGlobalVariable(IDs[1], value == true ? "true" : "false");
		} else if (service.isGlobalVariableDimmer) {
			this.setGlobalVariable(IDs[1], value == true ? "100" : "0");
		} else if (service.isHarmonyDevice) {
			this.command("changeActivityState", null, service, IDs);
		} else {
			this.command(value == 0 ? "turnOff" : "turnOn", null, service, IDs);
		}
	}
	async setBrightness(value, context, characteristic, service, IDs) {
		if (service.isGlobalVariableDimmer) {
			this.setGlobalVariable(IDs[1], value.toString());
		} else {
			this.command("setValue", [value], service, IDs);
		}
	}
	setTargetPosition(value, context, characteristic, service, IDs) {
		this.command("setValue", [value], service, IDs);
	}
	setTargetTiltAngle(angle, context, characteristic, service, IDs) {
		let value2 = SetFunctions.scale(angle, characteristic.props.minValue, characteristic.props.maxValue, 0, 100);
		this.command("setValue2", [value2], service, IDs);
	}
	setLockTargetState(value, context, characteristic, service, IDs) {
		if (service.isLockSwitch) {
			var action = (value == this.hapCharacteristic.LockTargetState.UNSECURED) ? "turnOn" : "turnOff";
			this.command(action, null, service, IDs);
			let lockCurrentStateCharacteristic = service.getCharacteristic(this.hapCharacteristic.LockCurrentState);
			lockCurrentStateCharacteristic.updateValue(value, undefined, 'fromSetValue');
			return;
		}

		var action = (value == this.hapCharacteristic.LockTargetState.UNSECURED) ? "unsecure" : "secure";
		this.command(action, [0], service, IDs);
		setTimeout(() => {
			let lockCurrentStateCharacteristic = service.getCharacteristic(this.hapCharacteristic.LockCurrentState);
			lockCurrentStateCharacteristic.updateValue(value, undefined, 'fromSetValue');
		}, 1000);
		// check if the action is correctly executed by reading the state after a specified timeout. If the lock is not active after the timeout an IFTTT message is generated
		if (this.platform.config.doorlocktimeout != "0") {
			var timeout = parseInt(this.platform.config.doorlocktimeout) * 1000;
			setTimeout(() => {
				this.checkLockCurrentState(IDs, value);
			}, timeout);
		}
	}
	setTargetDoorState(value, context, characteristic, service, IDs) {
		var action = value == 1 ? "close" : "open";
		this.command(action, [0], service, IDs);
		setTimeout(() => {
			characteristic.setValue(value, undefined, 'fromSetValue');
			// set also current state
			let currentDoorStateCharacteristic = service.getCharacteristic(this.hapCharacteristic.CurrentDoorState);
			currentDoorStateCharacteristic.setValue(value, undefined, 'fromSetValue');
		}, 100);
	}
	setTargetHeatingCoolingState(value, context, characteristic, service, IDs) {
		let v = "";
		switch (value) {
			case this.hapCharacteristic.TargetHeatingCoolingState.OFF:
				v = "Off";
				break;
			case this.hapCharacteristic.TargetHeatingCoolingState.HEAT:
				v = "Heat";
				break;
			//			case this.hapCharacteristic.TargetHeatingCoolingState.COOL:
			//				v = "Cool";
			//				break;
			//			case this.hapCharacteristic.TargetHeatingCoolingState.AUTO:
			//				v = "Auto";
			//				break;
			default:
				return;
		}
		this.command("setThermostatMode", [v], service, IDs);	// ... and full mode on mode controller	
	}
	async setTargetTemperature(value, context, characteristic, service, IDs) {
		this.command("setHeatingThermostatSetpoint", [value], service, IDs);
		this.command("setInterval", [parseInt(this.platform.config.thermostattimeout) + Math.trunc((new Date()).getTime() / 1000)], service, IDs);
	}
	setHue(value, context, characteristic, service, IDs) {
		this.updateHomeCenterColorFromHomeKit(value, null, service, IDs);
	}
	setSaturation(value, context, characteristic, service, IDs) {
		this.updateHomeCenterColorFromHomeKit(null, value, service, IDs);
	}
	setSecuritySystemTargetState(value, context, characteristic, service, IDs) {
		let sceneID = this.getTargetSecuritySystemSceneMapping.get(value);
		if (value == this.hapCharacteristic.SecuritySystemTargetState.DISARM)
			value = this.hapCharacteristic.SecuritySystemCurrentState.DISARMED;
		if (sceneID == undefined)
			return;
		this.scene(sceneID);
	}

	updateHomeCenterColorFromHomeKit(h, s, service, IDs) {
		if (h !== null)
			service.h = h;
		if (s !== null)
			service.s = s;
		if (service.h !== undefined && service.s !== undefined) {
			const v = service.characteristics[2].value;
			var rgbw = this.HSVtoRGB(service.h, service.s, v);
			this.command("setColor", [rgbw.r, rgbw.g, rgbw.b, rgbw.w], service, IDs);
			this.command("setValue", [v], service, IDs);
			delete service.h;
			delete service.s;
		}
	}

	HSVtoRGB(hue, saturation, value) {
		let h = hue / 360.0;
		let s = saturation / 100.0;
		let v = value / 100.0;
		let r, g, b, w, i, f, p, q, t;
		i = Math.floor(h * 6);
		f = h * 6 - i;
		p = v * (1 - s);
		q = v * (1 - f * s);
		t = v * (1 - (1 - f) * s);
		switch (i % 6) {
			case 0: r = v, g = t, b = p; break;
			case 1: r = q, g = v, b = p; break;
			case 2: r = p, g = v, b = t; break;
			case 3: r = p, g = q, b = v; break;
			case 4: r = t, g = p, b = v; break;
			case 5: r = v, g = p, b = q; break;
		}
		w = Math.min(r, g, b);
		return {
			r: Math.round(r * 255),
			g: Math.round(g * 255),
			b: Math.round(b * 255),
			w: Math.round(w * 255)
		};
	}

	async command(c, value, service, IDs) {
		try {
			await this.platform.fibaroClient.executeDeviceAction(IDs[0], c, value);
			this.platform.log("Command: ", c + ((value != undefined) ? ", value: " + value : "") + ", to: " + IDs[0]);
		} catch (e) {
			this.platform.log("There was a problem sending command ", c + " to " + IDs[0]);
		}
	}

	async scene(sceneID) {
		try {
			await this.platform.fibaroClient.executeScene(sceneID);
		} catch (e) {
			this.platform.log("There was a problem executing scene: ", sceneID);
		}
	}

	async setGlobalVariable(variableID, value) {
		try {
			await this.platform.fibaroClient.setGlobalVariable(variableID, value);
		} catch (e) {
			this.platform.log("There was a problem setting variable: ", `${variableID} to ${value}`);
		}
	}
	async checkLockCurrentState(IDs, value) {
		try {
			const properties = (await this.platform.fibaroClient.getDeviceProperties(IDs[0])).body.properties;
			var currentValue = (properties.value == true) ? this.hapCharacteristic.LockCurrentState.SECURED : this.hapCharacteristic.LockCurrentState.UNSECURED;
			if (currentValue != value) {
				this.platform.log("There was a problem setting value to Lock: ", `${IDs[0]}`);
			}
		} catch (e) {
			this.platform.log("There was a problem getting value from: ", `${IDs[0]} - Err: ${e}`);
		}
	}

	/***
	 *  Scale the value from input range to output range as integer
	 * @param num value to be scaled
	 * @param in_min input value range minimum
	 * @param in_max input value range maximum
	 * @param out_min output value range minimum
	 * @param out_max output value range maximum
	 */
	static scale(num: number, in_min: number, in_max: number, out_min: number, out_max: number): number {
		return Math.trunc((num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min);
	}
}

