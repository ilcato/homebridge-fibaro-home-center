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

import { SetFunctions } from './setFunctions'

export class GetFunctions {
	hapCharacteristic: any;
	getFunctionsMapping: Map<string, any>;
	getCurrentSecuritySystemStateMapping: Map<string, any>;
	getTargetSecuritySystemStateMapping: Map<string, any>;
	platform: any;

	constructor(hapCharacteristic, platform) {
		this.hapCharacteristic = hapCharacteristic;
		this.platform = platform;

		this.getFunctionsMapping = new Map([
			[(new hapCharacteristic.On()).UUID, { "function": this.getBool, "delay": 0 }],
			[(new hapCharacteristic.Brightness()).UUID, { "function": this.getBrightness, "delay": 0 }],
			[(new hapCharacteristic.PositionState()).UUID, { "function": this.getPositionState, "delay": 0 }],
			[(new hapCharacteristic.CurrentPosition()).UUID, { "function": this.getCurrentPosition, "delay": 0 }],
			[(new hapCharacteristic.TargetPosition()).UUID, { "function": this.getCurrentPosition, "delay": 0 }], 				// Manage the same as currentPosition
			[(new hapCharacteristic.CurrentHorizontalTiltAngle()).UUID, { "function": this.getCurrentTiltAngle, "delay": 0 }],
			[(new hapCharacteristic.TargetHorizontalTiltAngle()).UUID, { "function": this.getCurrentTiltAngle, "delay": 0 }],
			[(new hapCharacteristic.MotionDetected()).UUID, { "function": this.getBool, "delay": 0 }],
			[(new hapCharacteristic.CurrentTemperature()).UUID, { "function": this.getCurrentTemperature, "delay": 0 }],
			[(new hapCharacteristic.TargetTemperature()).UUID, { "function": this.getTargetTemperature, "delay": 0 }],
			[(new hapCharacteristic.CurrentRelativeHumidity()).UUID, { "function": this.getFloat, "delay": 0 }],
			[(new hapCharacteristic.ContactSensorState()).UUID, { "function": this.getContactSensorState, "delay": 0 }],
			[(new hapCharacteristic.LeakDetected()).UUID, { "function": this.getLeakDetected, "delay": 0 }],
			[(new hapCharacteristic.SmokeDetected()).UUID, { "function": this.getSmokeDetected, "delay": 0 }],
			[(new hapCharacteristic.CarbonMonoxideDetected()).UUID, { "function": this.getCarbonMonoxideDetected, "delay": 0 }],
			[(new hapCharacteristic.CarbonMonoxideLevel()).UUID, { "function": this.getCarbonMonoxideLevel, "delay": 0 }],
			[(new hapCharacteristic.CarbonMonoxidePeakLevel()).UUID, { "function": this.getCarbonMonoxidePeakLevel, "delay": 0 }],
			[(new hapCharacteristic.CurrentAmbientLightLevel()).UUID, { "function": this.getFloat, "delay": 0 }],
			[(new hapCharacteristic.OutletInUse()).UUID, { "function": this.getOutletInUse, "delay": 0 }],
			[(new hapCharacteristic.LockCurrentState()).UUID, { "function": this.getLockCurrentState, "delay": this.platform.config.LockCurrentStateDelay }],
			[(new hapCharacteristic.LockTargetState()).UUID, { "function": this.getLockCurrentState, "delay": this.platform.config.LockTargetStateDelay }], 				// Manage the same as currentState
			[(new hapCharacteristic.CurrentHeatingCoolingState()).UUID, { "function": this.getCurrentHeatingCoolingState, "delay": 0 }],
			[(new hapCharacteristic.TargetHeatingCoolingState()).UUID, { "function": this.getTargetHeatingCoolingState, "delay": 0 }],
			[(new hapCharacteristic.TemperatureDisplayUnits()).UUID, { "function": this.getTemperatureDisplayUnits, "delay": 0 }],
			[(new hapCharacteristic.Hue()).UUID, { "function": this.getHue, "delay": 0 }],
			[(new hapCharacteristic.Saturation()).UUID, { "function": this.getSaturation, "delay": 0 }],
			[(new hapCharacteristic.CurrentDoorState()).UUID, { "function": this.getCurrentDoorState, "delay": 0 }],
			[(new hapCharacteristic.TargetDoorState()).UUID, { "function": this.getCurrentDoorState, "delay": 0 }],
			[(new hapCharacteristic.ObstructionDetected()).UUID, { "function": this.getObstructionDetected, "delay": 0 }],
			[(new hapCharacteristic.BatteryLevel()).UUID, { "function": this.getBatteryLevel, "delay": 0 }],
			[(new hapCharacteristic.ChargingState()).UUID, { "function": this.getChargingState, "delay": 0 }],
			[(new hapCharacteristic.StatusLowBattery()).UUID, { "function": this.getStatusLowBattery, "delay": 0 }]
		]);
		this.getCurrentSecuritySystemStateMapping = new Map([
			["AwayArmed", this.hapCharacteristic.SecuritySystemCurrentState.AWAY_ARM],
			["Disarmed", this.hapCharacteristic.SecuritySystemCurrentState.DISARMED],
			["NightArmed", this.hapCharacteristic.SecuritySystemCurrentState.NIGHT_ARM],
			["StayArmed", this.hapCharacteristic.SecuritySystemCurrentState.STAY_ARM],
			["AlarmTriggered", this.hapCharacteristic.SecuritySystemCurrentState.ALARM_TRIGGERED]
		]);
		this.getTargetSecuritySystemStateMapping = new Map([
			["AwayArmed", this.hapCharacteristic.SecuritySystemTargetState.AWAY_ARM],
			["Disarmed", this.hapCharacteristic.SecuritySystemTargetState.DISARM],
			["NightArmed", this.hapCharacteristic.SecuritySystemTargetState.NIGHT_ARM],
			["StayArmed", this.hapCharacteristic.SecuritySystemTargetState.STAY_ARM]
		]);
	}

	// Boolean getter
	getBool(characteristic, service, IDs, properties) {
		let v = properties.value;
		if (v !== undefined) {
			v = this.getBoolean(v);
		} else {
			v = properties["ui.startStopActivitySwitch.value"];
			if (v == undefined) v = false;
		}
		characteristic.updateValue(v);
	}
	// Float getter
	getFloat(characteristic, service, IDs, properties) {
		if (isNaN(properties.value)) {
			return;
		}
		const r = parseFloat(properties.value);
		characteristic.updateValue(r);
	}
	getBrightness(characteristic, service, IDs, properties) {
		if (isNaN(properties.value)) {
			return;
		}
		let r = parseFloat(properties.value);
		if (r > 100)
			r = 100;
		if (r < 0)
			r = 0;
		if (service != null && !service.isGlobalVariableDimmer) { // For real dimmers
			if (r == 99)
				r = 100;
		}
		characteristic.updateValue(r);
	}
	getPositionState(characteristic, service, IDs, properties) {
		characteristic.updateValue(this.hapCharacteristic.PositionState.STOPPED);
	}
	getCurrentPosition(characteristic, service, IDs, properties) {
		let r = parseInt(properties.value);
		if (r >= characteristic.props.minValue && r <= characteristic.props.maxValue) {
			if (r == 99)
				r = 100;
			else if (r == 1)
				r = 0;
		} else {
			r = characteristic.props.minValue;
		}
		characteristic.updateValue(r);
	}
	getCurrentTiltAngle(characteristic, service, IDs, properties) {
		let value2 = parseInt(properties.value2);
		if (value2 >= 0 && value2 <= 100) {
			if (value2 == 99)
				value2 = 100;
			else if (value2 == 1)
				value2 = 0;
		} else {
			value2 = characteristic.props.minValue;
		}
		let angle = SetFunctions.scale(value2, 0, 100, characteristic.props.minValue, characteristic.props.maxValue);
		characteristic.updateValue(angle);
	}
	async getCurrentTemperature(characteristic, service, IDs, properties) {
		if (service.floatServiceId) {
			try {
				const properties = (await this.platform.fibaroClient.getDeviceProperties(service.floatServiceId)).body.properties;
				if (!properties.value) {
					this.platform.log('No value for Temperature.', '');
					return;
				}
				characteristic.updateValue(properties.value);
			} catch (e) {
				this.platform.log("There was a problem getting value from: ", `${service.floatServiceId} - Err: ${e}`);
				return;
			}
		} else {
			let value = properties.value;
			if (!value) {
				value = properties.heatingThermostatSetpoint
				if (!value) {
					this.platform.log('No value for Temperature.', '');
					return;
				}
			}
			characteristic.updateValue(value);
		}
	}
	getTargetTemperature(characteristic, service, IDs, properties) {
		if (isNaN(properties.heatingThermostatSetpoint)) {
			this.platform.log('heatingThermostatSetpoint is not a number.', '');
			return;
		}
		const t = parseFloat(properties.heatingThermostatSetpoint);
		if (t < characteristic.props.minValue)
			return;
		characteristic.updateValue(t);
		setTimeout(() => {
			characteristic.setValue(t, undefined, 'fromFibaro');
		}, 100);
	}
	getContactSensorState(characteristic, service, IDs, properties) {
		const v = this.getBoolean(properties.value);
		characteristic.updateValue(v === false ? this.hapCharacteristic.ContactSensorState.CONTACT_DETECTED : this.hapCharacteristic.ContactSensorState.CONTACT_NOT_DETECTED);
	}
	getLeakDetected(characteristic, service, IDs, properties) {
		const v = this.getBoolean(properties.value);
		characteristic.updateValue(v === true ? this.hapCharacteristic.LeakDetected.LEAK_DETECTED : this.hapCharacteristic.LeakDetected.LEAK_NOT_DETECTED);
	}
	getSmokeDetected(characteristic, service, IDs, properties) {
		const v = this.getBoolean(properties.value);
		characteristic.updateValue(v === true ? this.hapCharacteristic.SmokeDetected.SMOKE_DETECTED : this.hapCharacteristic.SmokeDetected.SMOKE_NOT_DETECTED);
	}
	getCarbonMonoxideDetected(characteristic, service, IDs, properties) {
		const v = this.getBoolean(properties.value);
		characteristic.updateValue(v === true ? this.hapCharacteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL : this.hapCharacteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL);
	}

	getCarbonMonoxideLevel(characteristic, service, IDs, properties) {
		let r = parseFloat(properties.concentration);
		characteristic.updateValue(r);
	}
	getCarbonMonoxidePeakLevel(characteristic, service, IDs, properties) {
		let r = parseFloat(properties.maxConcentration);
		characteristic.updateValue(r);
	}

	getOutletInUse(characteristic, service, IDs, properties) {
		if (isNaN(properties.power)) {
			this.platform.log('power is not a number.', '');
			return;
		}
		characteristic.updateValue(parseFloat(properties.power) > 1.0 ? true : false);
	}
	getLockCurrentState(characteristic, service, IDs, properties) {
		const v = this.getBoolean(properties.value);
		if (service.isLockSwitch) {
			characteristic.updateValue(v == false ? this.hapCharacteristic.LockCurrentState.SECURED : this.hapCharacteristic.LockCurrentState.UNSECURED);
			return
		}
		characteristic.updateValue(v == true ? this.hapCharacteristic.LockCurrentState.SECURED : this.hapCharacteristic.LockCurrentState.UNSECURED);
	}
	getCurrentHeatingCoolingState(characteristic, service, IDs, properties,) {
		switch (properties.thermostatMode) {
			case "Off": // OFF
				characteristic.updateValue(this.hapCharacteristic.CurrentHeatingCoolingState.OFF);
				break;
			case "Heat": // HEAT
				characteristic.updateValue(this.hapCharacteristic.CurrentHeatingCoolingState.HEAT);
				break;
			case "Cool": // COOL
				characteristic.updateValue(this.hapCharacteristic.CurrentHeatingCoolingState.COOL);
				break;
			default:
				break;
		}
	}
	getTargetHeatingCoolingState(characteristic, service, IDs, properties) {
		const m = properties.thermostatModeFuture ? properties.thermostatModeFuture : properties.thermostatMode;
		switch (m) {
			case "Off": // OFF
				characteristic.updateValue(this.hapCharacteristic.TargetHeatingCoolingState.OFF);
				break;
			case "Heat": // HEAT
				characteristic.updateValue(this.hapCharacteristic.TargetHeatingCoolingState.HEAT);
				break;
			case "Cool": // COOL
				characteristic.updateValue(this.hapCharacteristic.TargetHeatingCoolingState.COOL);
				break;
			case "Auto": // AUTO
				characteristic.updateValue(this.hapCharacteristic.TargetHeatingCoolingState.AUTO);
				break;
			default:
				break;
		}
	}
	getTemperatureDisplayUnits(characteristic, service, IDs, properties) {
		characteristic.updateValue(this.hapCharacteristic.TemperatureDisplayUnits.CELSIUS);
	}
	getHue(characteristic, service, IDs, properties) {
		characteristic.updateValue(Math.round(this.updateHomeKitColorFromHomeCenter(properties.color, service).h));
	}
	getSaturation(characteristic, service, IDs, properties) {
		characteristic.updateValue(Math.round(this.updateHomeKitColorFromHomeCenter(properties.color, service).s));
	}
	getCurrentDoorState(characteristic, service, IDs, properties) {
		characteristic.updateValue(properties.state == "Closed" ? this.hapCharacteristic.CurrentDoorState.CLOSED : this.hapCharacteristic.CurrentDoorState.OPEN);
	}
	getObstructionDetected(characteristic, service, IDs, properties) {
		characteristic.updateValue(0);
	}
	getBatteryLevel(characteristic, service, IDs, properties) {
		if (isNaN(properties.batteryLevel)) {
			this.platform.log('batteryLevel is not a number.', '');
			return;
		}
		let r = parseFloat(properties.batteryLevel);
		if (r > 100) r = 0;
		characteristic.updateValue(r);
	}
	getChargingState(characteristic, service, IDs, properties) {
		let r = 0;//parseFloat(properties.batteryLevel);
		characteristic.updateValue(r);
	}
	getStatusLowBattery(characteristic, service, IDs, properties) {
		if (isNaN(properties.batteryLevel)) {
			this.platform.log('batteryLevel is not a number.', '');
			return;
		}
		let r = parseFloat(properties.batteryLevel) <= 30 ? 1 : 0;
		characteristic.updateValue(r);
	}
	getSecuritySystemState(characteristic, service, IDs, securitySystemStatus) {
		let r = this.hapCharacteristic.SecuritySystemTargetState.DISARMED;
		if (characteristic.UUID == (new this.hapCharacteristic.SecuritySystemCurrentState()).UUID) {
			r = this.getCurrentSecuritySystemStateMapping.get(securitySystemStatus.value);
		} else if (characteristic.UUID == (new this.hapCharacteristic.SecuritySystemTargetState()).UUID) {
			r = this.getTargetSecuritySystemStateMapping.get(securitySystemStatus.value);
		}
		if (r !== undefined)
			characteristic.updateValue(r);
	}

	updateHomeKitColorFromHomeCenter(color, service) {
		let colors = color.split(",");
		let r = parseInt(colors[0]);
		let g = parseInt(colors[1]);
		let b = parseInt(colors[2]);
		let w = parseInt(colors[3]);
		let hsv = this.RGBtoHSV(r, g, b, w);
		return hsv;
	}
	RGBtoHSV(r, g, b, w) {
		if (arguments.length === 1) {
			g = r.g, b = r.b, r = r.r;
		}
		var max = Math.max(r, g, b),
			min = Math.min(r, g, b),
			d = max - min,
			h,
			s = (max === 0 ? 0 : d / max),
			v = Math.max(max, w) / 255;

		switch (max) {
			case min: h = 0; break;
			case r: h = (g - b) + d * (g < b ? 6 : 0); h /= 6 * d; break;
			case g: h = (b - r) + d * 2; h /= 6 * d; break;
			case b: h = (r - g) + d * 4; h /= 6 * d; break;
		}

		return {
			h: h * 360.0,
			s: s * 100.0,
			v: v * 100.0
		};
	}
	getBoolean(value) {
		if (typeof value === "number") {
			if (value === 0) return false;
			else return true;
		}
		if (typeof value === "string") {
			const vNum = parseInt(value);
			if (!isNaN(vNum)) {
				if (vNum === 0) return false;
				else return true;
			}
		}

		switch (value) {
			case true:
			case "true":
			case "on":
			case "yes":
				return true;
			default:
				return false;
		}
	}
}

