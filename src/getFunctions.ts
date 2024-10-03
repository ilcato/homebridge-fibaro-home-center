// getFunctions.ts

'use strict';

import { Characteristic } from 'hap-nodejs';
import { Utils } from './utils';

// Decorator function
function characteristicGetter(...characteristics: string[]) {
  return function (target, propertyKey: string, descriptor: PropertyDescriptor) {
    if (!target.constructor.getFunctionsMapping) {
      target.constructor.getFunctionsMapping = new Map();
    }
    characteristics.forEach(char => {
      target.constructor.getFunctionsMapping.set(char, descriptor.value);
    });
  };
}

export class GetFunctions {
  static getFunctionsMapping: Map<string, (...args: unknown[]) => unknown>;
  // Initialize security system mappings
  static CurrentSecuritySystemStateMapping = new Map([
    ['AwayArmed', Characteristic.SecuritySystemCurrentState.AWAY_ARM],
    ['Disarmed', Characteristic.SecuritySystemCurrentState.DISARMED],
    ['NightArmed', Characteristic.SecuritySystemCurrentState.NIGHT_ARM],
    ['StayArmed', Characteristic.SecuritySystemCurrentState.STAY_ARM],
    ['AlarmTriggered', Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED],
  ]);

  static TargetSecuritySystemStateMapping = new Map([
    ['AwayArmed', Characteristic.SecuritySystemTargetState.AWAY_ARM],
    ['Disarmed', Characteristic.SecuritySystemTargetState.DISARM],
    ['NightArmed', Characteristic.SecuritySystemTargetState.NIGHT_ARM],
    ['StayArmed', Characteristic.SecuritySystemTargetState.STAY_ARM],
  ]);

  constructor(private platform) {}

  @characteristicGetter(Characteristic.On.UUID, Characteristic.MotionDetected.UUID, Characteristic.OccupancyDetected.UUID)
  getBool(characteristic, service, IDs, properties) {
    const v = properties.value ?? properties['ui.startStopActivitySwitch.value'] ?? false;
    characteristic.updateValue(Utils.getBoolean(v));
  }

  @characteristicGetter(Characteristic.Brightness.UUID)
  getBrightness(characteristic, service, _IDs, { value }) {
    if (isNaN(value)) {
      return;
    }
    let r = Math.min(Math.max(parseFloat(value), 0), 100);

    if (service && !service.isGlobalVariableDimmer && r === 99) {
      r = 100;
    }

    const onCharacteristic = service?.getCharacteristic(Characteristic.On);
    if (onCharacteristic?.value === false) {
      return;
    }

    characteristic.updateValue(r);
  }

  @characteristicGetter(Characteristic.PositionState.UUID)
  getPositionState(characteristic) {
    characteristic.updateValue(Characteristic.PositionState.STOPPED);
  }

  @characteristicGetter(Characteristic.CurrentPosition.UUID, Characteristic.TargetPosition.UUID)
  getCurrentPosition(characteristic, _service, _IDs, properties) {
    const value = properties.value;
    const state = properties.state;
    let position;

    if (value !== undefined && !isNaN(value)) {
      position = Math.min(Math.max(parseInt(value), characteristic.props.minValue), characteristic.props.maxValue);
      position = position === 99 ? 100 : position === 1 ? 0 : position;
    } else {
      position = state === 'Closed' ? 0 : 100;
    }

    characteristic.updateValue(position);
  }

  @characteristicGetter(Characteristic.CurrentHorizontalTiltAngle.UUID, Characteristic.TargetHorizontalTiltAngle.UUID)
  getCurrentTiltAngle(characteristic, _service, _IDs, properties) {
    const value2 = parseInt(properties.value2 ?? '');
    const angle = (() => {
      if (value2 >= 0 && value2 <= 100) {
        const adjustedValue = value2 === 99 ? 100 : value2 === 1 ? 0 : value2;
        return Utils.scale(adjustedValue, 0, 100, characteristic.props.minValue, characteristic.props.maxValue);
      }
      return characteristic.props.minValue;
    })();

    characteristic.updateValue(angle);
  }

  @characteristicGetter(Characteristic.CurrentTemperature.UUID)
  async getCurrentTemperature(characteristic, service, IDs, properties) {
    try {
      let temperature;

      if (service.isClimateZone || service.isHeatingZone) {
        temperature = await this.getZoneTemperature(service, IDs[0]);
      } else {
        temperature = properties.value;
      }

      characteristic.updateValue(temperature);
    } catch (e) {
      this.platform.log(`Error getting Current Temperature: ${service.IDs[0]} - Err: ${e}`);
    }
  }

  @characteristicGetter(Characteristic.TargetTemperature.UUID)
  async getTargetTemperature(characteristic, service, IDs, properties) {
    try {
      let temperature;

      if (service.isClimateZone || service.isHeatingZone) {
        temperature = await this.getZoneTemperature(service, IDs[0]);
      } else {
        temperature = properties.value;
      }

      characteristic.updateValue(temperature);
    } catch (e) {
      this.platform.log(`Error getting Target Temperature: ${service.IDs[0]} - Err: ${e}`);
    }
  }

  async getZoneTemperature(service, zoneId) {
    const getZoneFunction = service.isClimateZone ?
      this.platform.fibaroClient.getClimateZone :
      this.platform.fibaroClient.getHeatingZone;

    const response = await getZoneFunction.call(this.platform.fibaroClient, zoneId);
    if (!response || !response.body || !response.body.properties) {
      throw new Error(`No valid response for zone ${zoneId}.`);
    }
    const { body: { properties: zoneProperties } } = response;

    const tempProperty = service.isClimateZone ? 'currentTemperatureHeating' : 'currentTemperature';

    const temperature = zoneProperties[tempProperty];

    if (temperature === undefined) {
      throw new Error(`No value for Temperature in zone: ${zoneId}.`);
    }

    return temperature;
  }

  @characteristicGetter(Characteristic.ContactSensorState.UUID)
  getContactSensorState(characteristic, _service, _IDs, properties) {
    const v = Utils.getBoolean(properties.value);
    characteristic.updateValue(v === false ?
      Characteristic.ContactSensorState.CONTACT_DETECTED :
      Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
  }

  @characteristicGetter(Characteristic.LeakDetected.UUID)
  getLeakDetected(characteristic, _service, _IDs, properties) {
    const v = Utils.getBoolean(properties.value);
    characteristic.updateValue(v === true ?
      Characteristic.LeakDetected.LEAK_DETECTED :
      Characteristic.LeakDetected.LEAK_NOT_DETECTED);
  }

  @characteristicGetter(Characteristic.SmokeDetected.UUID)
  getSmokeDetected(characteristic, _service, _IDs, properties) {
    const v = Utils.getBoolean(properties.value);
    characteristic.updateValue(v === true ?
      Characteristic.SmokeDetected.SMOKE_DETECTED :
      Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
  }

  @characteristicGetter(Characteristic.CarbonMonoxideDetected.UUID)
  getCarbonMonoxideDetected(characteristic, _service, _IDs, properties) {
    const v = Utils.getBoolean(properties.value);
    characteristic.updateValue(v === true ?
      Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL :
      Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL);
  }

  @characteristicGetter(Characteristic.CarbonMonoxideLevel.UUID)
  getCarbonMonoxideLevel(characteristic, _service, _IDs, properties) {
    const r = parseFloat(properties.concentration);
    characteristic.updateValue(r);
  }

  @characteristicGetter(Characteristic.CarbonMonoxidePeakLevel.UUID)
  getCarbonMonoxidePeakLevel(characteristic, _service, _IDs, properties) {
    const r = parseFloat(properties.maxConcentration);
    characteristic.updateValue(r);
  }

  @characteristicGetter(Characteristic.OutletInUse.UUID)
  getOutletInUse(characteristic, _service, _IDs, properties) {
    const power = properties.power;
    if (power !== undefined && !isNaN(power)) {
      characteristic.updateValue(parseFloat(power) > 1.0);
    }
  }

  @characteristicGetter(Characteristic.LockCurrentState.UUID, Characteristic.LockTargetState.UUID)
  getLockCurrentState(characteristic, service, _IDs, properties) {
    const v = Utils.getBoolean(properties.value);
    const { LockCurrentState } = Characteristic;

    const state = service.isLockSwitch
      ? (v ? LockCurrentState.UNSECURED : LockCurrentState.SECURED)
      : (v ? LockCurrentState.SECURED : LockCurrentState.UNSECURED);

    characteristic.updateValue(state);
  }

  @characteristicGetter(Characteristic.CurrentHeatingCoolingState.UUID)
  async getCurrentHeatingCoolingState(characteristic, service, IDs) {
    try {
      if (service.isClimateZone) {
        const { body: { properties } } = await this.platform.fibaroClient.getClimateZone(IDs[0]);
        if (!properties.mode) {
          throw new Error('No value for heating cooling state.');
        }

        const { CurrentHeatingCoolingState } = Characteristic;
        const modeMap = {
          'Off': CurrentHeatingCoolingState.OFF,
          'Heat': CurrentHeatingCoolingState.HEAT,
          'Cool': CurrentHeatingCoolingState.COOL,
        };

        const state = modeMap[properties.mode];
        if (state !== undefined) {
          characteristic.updateValue(state);
        }
      } else if (service.isHeatingZone) {
        characteristic.updateValue(Characteristic.TargetHeatingCoolingState.HEAT);
      }
    } catch (e) {
      this.platform.log(`Error getting Current Heating Cooling State: ${service.IDs[0]} - Err: ${e}`);
    }
  }

  @characteristicGetter(Characteristic.TargetHeatingCoolingState.UUID)
  async getTargetHeatingCoolingState(characteristic, service, IDs) {
    try {
      if (service.isClimateZone) {
        const { body: { properties } } = await this.platform.fibaroClient.getClimateZone(IDs[0]);
        if (!properties.mode) {
          throw new Error('No value for heating cooling state.');
        }

        const { TargetHeatingCoolingState } = Characteristic;
        const modeMap = {
          'Off': TargetHeatingCoolingState.OFF,
          'Heat': TargetHeatingCoolingState.HEAT,
          'Cool': TargetHeatingCoolingState.COOL,
        };

        const state = modeMap[properties.mode];
        if (state !== undefined) {
          characteristic.updateValue(state);
        }
      } else if (service.isHeatingZone) {
        characteristic.updateValue(Characteristic.TargetHeatingCoolingState.HEAT);
      }
    } catch (e) {
      this.platform.log(`Error getting Target Heating Cooling State: ${service.IDs[0]} - Err: ${e}`);
    }
  }

  @characteristicGetter(Characteristic.TemperatureDisplayUnits.UUID)
  getTemperatureDisplayUnits(characteristic) {
    characteristic.updateValue(Characteristic.TemperatureDisplayUnits.CELSIUS);
  }

  @characteristicGetter(Characteristic.Hue.UUID)
  getHue(characteristic, service, _IDs, properties) {
    characteristic.updateValue(Math.round(Utils.updateHomeKitColorFromHomeCenter(properties.color).h));
  }

  @characteristicGetter(Characteristic.Saturation.UUID)
  getSaturation(characteristic, service, _IDs, properties) {
    characteristic.updateValue(Math.round(Utils.updateHomeKitColorFromHomeCenter(properties.color).s));
  }

  @characteristicGetter(Characteristic.CurrentDoorState.UUID)
  getCurrentDoorState(characteristic, _service, _IDs, properties) {
    const { CurrentDoorState } = Characteristic;
    const stateMap = {
      'Opened': CurrentDoorState.OPEN,
      'Opening': CurrentDoorState.OPENING,
      'Closing': CurrentDoorState.CLOSING,
      'Closed': CurrentDoorState.CLOSED,
    };

    const v = parseInt(properties.value);

    if (!isNaN(v)) {
      this.platform.log('getCurrentDoorState value:', v);
      if (v === 0) {
        return characteristic.updateValue(CurrentDoorState.CLOSED);
      }
      if (v === 99) {
        return characteristic.updateValue(CurrentDoorState.OPEN);
      }
      return characteristic.updateValue(CurrentDoorState.STOPPED);
    }

    if (properties.state !== undefined) {
      this.platform.log('getCurrentDoorState:', properties.state);
      const mappedState = stateMap[properties.state];
      if (mappedState !== undefined) {
        return characteristic.updateValue(mappedState);
      }
    }

    characteristic.updateValue(CurrentDoorState.STOPPED);
  }

  @characteristicGetter(Characteristic.TargetDoorState.UUID)
  getTargetDoorState(characteristic, _service, _IDs, properties) {
    const { TargetDoorState } = Characteristic;
    const stateMap = {
      'Opened': TargetDoorState.OPEN,
      'Opening': TargetDoorState.OPEN,
      'Closing': TargetDoorState.CLOSED,
      'Closed': TargetDoorState.CLOSED,
    };

    const v = parseInt(properties.value);

    if (!isNaN(v)) {
      this.platform.log('getTargetDoorState value:', v);
      return characteristic.updateValue(v === 0 ? TargetDoorState.CLOSED : TargetDoorState.OPEN);
    }

    if (properties.state) {
      this.platform.log('getTargetDoorState:', properties.state);
      const mappedState = stateMap[properties.state];
      if (mappedState !== undefined) {
        return characteristic.updateValue(mappedState);
      }
    }

    characteristic.updateValue(TargetDoorState.CLOSED);
  }

  @characteristicGetter(Characteristic.ObstructionDetected.UUID)
  getObstructionDetected(characteristic) {
    characteristic.updateValue(0);
  }

  @characteristicGetter(Characteristic.BatteryLevel.UUID)
  getBatteryLevel(characteristic, _service, _IDs, properties) {
    const batteryLevel = parseFloat(properties.batteryLevel);

    if (isNaN(batteryLevel)) {
      this.platform.log('batteryLevel is not a number.');
      return;
    }

    const level = batteryLevel > 100 ? 0 : batteryLevel;
    characteristic.updateValue(level);
  }

  @characteristicGetter(Characteristic.ChargingState.UUID)
  getChargingState(characteristic) {
    characteristic.updateValue(0);
  }

  @characteristicGetter(Characteristic.StatusLowBattery.UUID)
  getStatusLowBattery(characteristic, _service, _IDs, properties) {
    if (isNaN(properties.batteryLevel)) {
      this.platform.log('batteryLevel is not a number.', '');
      return;
    }
    const batteryLevel = parseFloat(properties.batteryLevel);
    const r = (batteryLevel <= 20 || batteryLevel > 100) ? 1 : 0;
    characteristic.updateValue(r);
  }

  static getSecuritySystemState(characteristic, _service, _IDs, securitySystemStatus) {
    let r = Characteristic.SecuritySystemTargetState.DISARM;
    if (characteristic.UUID === (new Characteristic.SecuritySystemCurrentState()).UUID) {
      r = GetFunctions.CurrentSecuritySystemStateMapping.get(securitySystemStatus.value) ?? 0;
    } else if (characteristic.UUID === (new Characteristic.SecuritySystemTargetState()).UUID) {
      r = GetFunctions.TargetSecuritySystemStateMapping.get(securitySystemStatus.value) ?? 0;
    }
    if (r !== undefined) {
      characteristic.updateValue(r);
    }
  }

  @characteristicGetter(Characteristic.Active.UUID)
  getActive(characteristic, _service, _IDs, properties) {
    const v = Utils.getBoolean(properties.value);
    characteristic.updateValue(v === false ?
      Characteristic.Active.INACTIVE :
      Characteristic.Active.ACTIVE);
  }

  @characteristicGetter(Characteristic.InUse.UUID)
  getInUse(characteristic, _service, _IDs, properties) {
    const v = Utils.getBoolean(properties.value);
    characteristic.updateValue(v === false ?
      Characteristic.InUse.NOT_IN_USE :
      Characteristic.InUse.IN_USE);
  }

  @characteristicGetter(Characteristic.ProgrammableSwitchEvent.UUID)
  getProgrammableSwitchEvent(characteristic, _service, _IDs, properties) {
    const v = Utils.getBoolean(properties.value);
    if (v) {
      characteristic.updateValue(Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
    }
  }

  @characteristicGetter(Characteristic.AirQuality.UUID)
  getAirQuality(characteristic, _service, _IDs, properties) {
    const v = parseFloat(properties.value);
    // 2024 AQI for PM 2.5
    // https://www.epa.gov/system/files/documents/2024-02/pm-naaqs-air-quality-index-fact-sheet.pdf
    if (_service.isPM2_5Sensor) {
      if (v <= 5) {
        characteristic.updateValue(Characteristic.AirQuality.EXCELLENT);
      } else if (v < 9.1) {
        characteristic.updateValue(Characteristic.AirQuality.GOOD);
      } else if ( v < 35.5) {
        characteristic.updateValue(Characteristic.AirQuality.FAIR);
      } else if ( v < 55.5) {
        characteristic.updateValue(Characteristic.AirQuality.INFERIOR);
      } else {
        characteristic.updateValue(Characteristic.AirQuality.POOR);
      }
    }
  }

  @characteristicGetter(
    Characteristic.CurrentRelativeHumidity.UUID,
    Characteristic.CurrentAmbientLightLevel.UUID,
    Characteristic.PM2_5Density.UUID)
  getFloat(characteristic, _service, _IDs, properties) {
    const value = properties.value;
    if (value !== undefined && !isNaN(value)) {
      characteristic.updateValue(parseFloat(value));
    }
  }
}