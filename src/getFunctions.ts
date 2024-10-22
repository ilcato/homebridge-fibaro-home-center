// getFunctions.ts

import 'reflect-metadata';
import { Utils } from './utils';
import { Characteristics } from './constants';

// Decorator function for mapping getCharacteristicValue to the Characteristic
function characteristicGetter(...characteristics: unknown[]) {
  return function (target, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingMethods = Reflect.getMetadata('characteristicMethods', target) || [];
    existingMethods.push([propertyKey, characteristics]);
    Reflect.defineMetadata('characteristicMethods', existingMethods, target);
    return descriptor;
  };
}
export class GetFunctions {
  getFunctionsMapping: Map<unknown, (...args: unknown[]) => unknown>;
  CurrentSecuritySystemStateMapping;
  TargetSecuritySystemStateMapping;
  modeMap;

  constructor(private platform) {
    this.getFunctionsMapping = new Map();

    this.CurrentSecuritySystemStateMapping = new Map([
      ['AwayArmed', this.platform.Characteristic.SecuritySystemCurrentState.AWAY_ARM],
      ['Disarmed', this.platform.Characteristic.SecuritySystemCurrentState.DISARMED],
      ['NightArmed', this.platform.Characteristic.SecuritySystemCurrentState.NIGHT_ARM],
      ['StayArmed', this.platform.Characteristic.SecuritySystemCurrentState.STAY_ARM],
      ['AlarmTriggered', this.platform.Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED],
    ]);

    this.TargetSecuritySystemStateMapping = new Map([
      ['AwayArmed', this.platform.Characteristic.SecuritySystemTargetState.AWAY_ARM],
      ['Disarmed', this.platform.Characteristic.SecuritySystemTargetState.DISARM],
      ['NightArmed', this.platform.Characteristic.SecuritySystemTargetState.NIGHT_ARM],
      ['StayArmed', this.platform.Characteristic.SecuritySystemTargetState.STAY_ARM],
    ]);

    const { CurrentHeatingCoolingState } = this.platform.Characteristic;
    this.modeMap = {
      'Off': CurrentHeatingCoolingState.OFF,
      'Heat': CurrentHeatingCoolingState.HEAT,
      'Cool': CurrentHeatingCoolingState.COOL,
    };


    this.initializeFunctionsMapping();
  }

  private initializeFunctionsMapping() {
    const prototype = Object.getPrototypeOf(this);
    const characteristicMethods = Reflect.getMetadata('characteristicMethods', prototype) || [];

    for (const [methodName, characteristics] of characteristicMethods) {
      for (const characteristic of characteristics) {
        this.getFunctionsMapping.set(this.platform.Characteristic[characteristic], this[methodName].bind(this));
      }
    }
  }

  @characteristicGetter(Characteristics.On, Characteristics.MotionDetected, Characteristics.OccupancyDetected)
  getBool(characteristic, service, IDs, properties) {
    const v = properties.value ?? properties['ui.startStopActivitySwitch.value'] ?? false;
    characteristic.updateValue(Utils.getBoolean(v));
  }

  @characteristicGetter(Characteristics.Brightness)
  getBrightness(characteristic, service, _IDs, { value }) {
    if (isNaN(value)) {
      return;
    }
    let r = Math.min(Math.max(parseFloat(value), 0), 100);

    if (service && !service.isGlobalVariableDimmer && r === 99) {
      r = 100;
    }

    const onCharacteristic = service?.getCharacteristic(this.platform.Characteristic.On);
    if (onCharacteristic?.value === false) {
      return;
    }

    characteristic.updateValue(r);
  }

  @characteristicGetter(Characteristics.PositionState)
  getPositionState(characteristic) {
    characteristic.updateValue(this.platform.Characteristic.PositionState.STOPPED);
  }

  @characteristicGetter(Characteristics.CurrentPosition, Characteristics.TargetPosition)
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

  @characteristicGetter(Characteristics.CurrentHorizontalTiltAngle, Characteristics.TargetHorizontalTiltAngle)
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

  @characteristicGetter(Characteristics.CurrentTemperature)
  async getCurrentTemperature(characteristic, service, IDs, properties) {
    try {
      let temperature;

      switch (true) {
        case service.isClimateZone || service.isHeatingZone:
          temperature = await this.getZoneTemperature(service, IDs[0]);
          break;
        case service.isRadiatorThermostaticValve:
          temperature = properties.heatingThermostatSetpoint;
          break;
        default:
          temperature = properties.value;
      }
      if (typeof temperature === 'string') {
        temperature = parseFloat(temperature);
      }
      if (isNaN(temperature)) {
        throw new Error('No value');
      }
      if (temperature < characteristic.props.minValue) {
        temperature = characteristic.props.minValue;
      }
      if (temperature > characteristic.props.maxValue) {
        temperature = characteristic.props.maxValue;
      }

      characteristic.updateValue(temperature);
    } catch (e) {
      this.platform.log(`Error getting Current Temperature: ${service.IDs[0]} - Err: ${e}`);
    }
  }

  @characteristicGetter(Characteristics.TargetTemperature)
  async getTargetTemperature(characteristic, service, IDs, properties) {
    try {
      let temperature;

      switch (true) {
        case service.isClimateZone || service.isHeatingZone:
          temperature = await this.getZoneTemperature(service, IDs[0]);
          break;
        case service.isRadiatorThermostaticValve:
          temperature = properties.heatingThermostatSetpointFuture;
          break;
        default:
          temperature = properties.value;
      }
      if (typeof temperature === 'string') {
        temperature = parseFloat(temperature);
      }
      if (isNaN(temperature)) {
        throw new Error('No value');
      }
      if (temperature < characteristic.props.minValue) {
        temperature = characteristic.props.minValue;
      }
      if (temperature > characteristic.props.maxValue) {
        temperature = characteristic.props.maxValue;
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

  @characteristicGetter(Characteristics.ContactSensorState)
  getContactSensorState(characteristic, _service, _IDs, properties) {
    const v = Utils.getBoolean(properties.value);
    characteristic.updateValue(v === false ?
      this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED :
      this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
  }

  @characteristicGetter(Characteristics.LeakDetected)
  getLeakDetected(characteristic, _service, _IDs, properties) {
    const v = Utils.getBoolean(properties.value);
    characteristic.updateValue(v === true ?
      this.platform.Characteristic.LeakDetected.LEAK_DETECTED :
      this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED);
  }

  @characteristicGetter(Characteristics.SmokeDetected)
  getSmokeDetected(characteristic, _service, _IDs, properties) {
    const v = Utils.getBoolean(properties.value);
    characteristic.updateValue(v === true ?
      this.platform.Characteristic.SmokeDetected.SMOKE_DETECTED :
      this.platform.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
  }

  @characteristicGetter(Characteristics.CarbonMonoxideDetected)
  getCarbonMonoxideDetected(characteristic, _service, _IDs, properties) {
    const v = Utils.getBoolean(properties.value);
    characteristic.updateValue(v === true ?
      this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL :
      this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL);
  }

  @characteristicGetter(Characteristics.CarbonMonoxideLevel)
  getCarbonMonoxideLevel(characteristic, _service, _IDs, properties) {
    const r = parseFloat(properties.concentration);
    characteristic.updateValue(r);
  }

  @characteristicGetter(Characteristics.CarbonMonoxidePeakLevel)
  getCarbonMonoxidePeakLevel(characteristic, _service, _IDs, properties) {
    const r = parseFloat(properties.maxConcentration);
    characteristic.updateValue(r);
  }

  @characteristicGetter(Characteristics.OutletInUse)
  getOutletInUse(characteristic, _service, _IDs, properties) {
    const power = properties.power;
    if (power !== undefined && !isNaN(power)) {
      characteristic.updateValue(parseFloat(power) > 1.0);
    }
  }

  @characteristicGetter(Characteristics.LockCurrentState, Characteristics.LockTargetState)
  getLockCurrentState(characteristic, service, _IDs, properties) {
    const v = Utils.getBoolean(properties.value);
    const { LockCurrentState } = this.platform.Characteristic;

    const state = service.isLockSwitch
      ? (v ? LockCurrentState.UNSECURED : LockCurrentState.SECURED)
      : (v ? LockCurrentState.SECURED : LockCurrentState.UNSECURED);

    characteristic.updateValue(state);
  }

  @characteristicGetter(Characteristics.CurrentHeatingCoolingState)
  async getCurrentHeatingCoolingState(characteristic, service, IDs, properties) {
    try {
      switch (true) {
        case service.isClimateZone: {
          const { body: { properties } } = await this.platform.fibaroClient.getClimateZone(IDs[0]);
          if (!properties.mode) {
            throw new Error('No value for heating cooling state.');
          }
          const state = this.modeMap[properties.mode];
          if (state !== undefined) {
            characteristic.updateValue(state);
          }
          break;
        }
        case service.isHeatingZone:
          characteristic.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.HEAT);
          break;
        case service.isRadiatorThermostaticValve: {
          const state = this.modeMap[properties.thermostatMode] || this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
          characteristic.updateValue(state);
          break;
        }
      }
    } catch (e) {
      this.platform.log(`Error getting Current Heating Cooling State: ${service.IDs[0]} - Err: ${e}`);
    }
  }

  @characteristicGetter(Characteristics.TargetHeatingCoolingState)
  async getTargetHeatingCoolingState(characteristic, service, IDs, properties) {
    try {
      switch (true) {
        case service.isClimateZone: {
          const { body: { properties } } = await this.platform.fibaroClient.getClimateZone(IDs[0]);
          if (!properties.mode) {
            throw new Error('No value for heating cooling state.');
          }

          const state = this.modeMap[properties.mode];
          if (state !== undefined) {
            characteristic.updateValue(state);
          }
          break;
        }
        case service.isHeatingZone:
          characteristic.updateValue(this.platform.Characteristic.TargetHeatingCoolingState.HEAT);
          break;
        case service.isRadiatorThermostaticValve: {
          const state = this.modeMap[properties.thermostatModeFuture] || this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
          characteristic.updateValue(state);
          break;
        }
      }
    } catch (e) {
      this.platform.log(`Error getting Target Heating Cooling State: ${service.IDs[0]} - Err: ${e}`);
    }
  }

  @characteristicGetter(Characteristics.TemperatureDisplayUnits)
  getTemperatureDisplayUnits(characteristic) {
    characteristic.updateValue(this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);
  }

  @characteristicGetter(Characteristics.Hue)
  getHue(characteristic, service, _IDs, properties) {
    characteristic.updateValue(Math.round(Utils.updateHomeKitColorFromHomeCenter(properties.color).h));
  }

  @characteristicGetter(Characteristics.Saturation)
  getSaturation(characteristic, service, _IDs, properties) {
    characteristic.updateValue(Math.round(Utils.updateHomeKitColorFromHomeCenter(properties.color).s));
  }

  @characteristicGetter(Characteristics.CurrentDoorState)
  getCurrentDoorState(characteristic, _service, _IDs, properties) {
    const { CurrentDoorState } = this.platform.Characteristic;
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

  @characteristicGetter(Characteristics.TargetDoorState)
  getTargetDoorState(characteristic, _service, _IDs, properties) {
    const { TargetDoorState } = this.platform.Characteristic;
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

  @characteristicGetter(Characteristics.ObstructionDetected)
  getObstructionDetected(characteristic) {
    characteristic.updateValue(0);
  }

  @characteristicGetter(Characteristics.BatteryLevel)
  getBatteryLevel(characteristic, _service, _IDs, properties) {
    const batteryLevel = parseFloat(properties.batteryLevel);

    if (isNaN(batteryLevel)) {
      this.platform.log('batteryLevel is not a number.');
      return;
    }

    const level = batteryLevel > 100 ? 0 : batteryLevel;
    characteristic.updateValue(level);
  }

  @characteristicGetter(Characteristics.ChargingState)
  getChargingState(characteristic) {
    characteristic.updateValue(0);
  }

  @characteristicGetter(Characteristics.StatusLowBattery)
  getStatusLowBattery(characteristic, _service, _IDs, properties) {
    if (isNaN(properties.batteryLevel)) {
      this.platform.log('batteryLevel is not a number.', '');
      return;
    }
    const batteryLevel = parseFloat(properties.batteryLevel);
    const r = (batteryLevel <= 20 || batteryLevel > 100) ? 1 : 0;
    characteristic.updateValue(r);
  }

  getSecuritySystemState(characteristic, _service, _IDs, securitySystemStatus) {
    let r = this.platform.Characteristic.SecuritySystemTargetState.DISARM;
    if (characteristic.constructor === this.platform.Characteristic.SecuritySystemCurrentState) {
      r = this.CurrentSecuritySystemStateMapping.get(securitySystemStatus.value) ?? 0;
    } else if (characteristic.constructor === this.platform.Characteristic.SecuritySystemTargetState) {
      r = this.TargetSecuritySystemStateMapping.get(securitySystemStatus.value) ?? 0;
    }
    if (r !== undefined) {
      characteristic.updateValue(r);
    }
  }

  @characteristicGetter(Characteristics.Active)
  getActive(characteristic, _service, _IDs, properties) {
    const v = Utils.getBoolean(properties.value);
    characteristic.updateValue(v === false ?
      this.platform.Characteristic.Active.INACTIVE :
      this.platform.Characteristic.Active.ACTIVE);
  }

  @characteristicGetter(Characteristics.InUse)
  getInUse(characteristic, _service, _IDs, properties) {
    const v = Utils.getBoolean(properties.value);
    characteristic.updateValue(v === false ?
      this.platform.Characteristic.InUse.NOT_IN_USE :
      this.platform.Characteristic.InUse.IN_USE);
  }

  @characteristicGetter(Characteristics.ProgrammableSwitchEvent)
  getProgrammableSwitchEvent(characteristic, service, _IDs, properties) {
    if (service.isRemoteControllerSceneActivation) {
      if (properties.value % 2 === 1) { // 1 for single press, 0 for double press
        characteristic.updateValue(this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
      } else {
        characteristic.updateValue(this.platform.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
      }
    } else if (service.isRemoteControllerCentralScene) {
      switch (properties.value) {
        case 'Pressed':
          characteristic.updateValue(this.platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
          break;
        case 'Pressed2':
          characteristic.updateValue(this.platform.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);
          break;
        case 'HeldDown':
          characteristic.updateValue(this.platform.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
          break;
        default:
          return;
      }
    }
  }

  @characteristicGetter(Characteristics.ServiceLabelIndex)
  getServiceLabelIndex(characteristic, service) {
    characteristic.updateValue(service.remoteButtonNumber);
  }

  @characteristicGetter(Characteristics.AirQuality)
  getAirQuality(characteristic, _service, _IDs, properties) {
    const v = parseFloat(properties.value);
    // 2024 AQI for PM 2.5
    // https://www.epa.gov/system/files/documents/2024-02/pm-naaqs-air-quality-index-fact-sheet.pdf
    if (_service.isPM2_5Sensor) {
      if (v <= 5) {
        characteristic.updateValue(this.platform.Characteristic.AirQuality.EXCELLENT);
      } else if (v < 9.1) {
        characteristic.updateValue(this.platform.Characteristic.AirQuality.GOOD);
      } else if ( v < 35.5) {
        characteristic.updateValue(this.platform.Characteristic.AirQuality.FAIR);
      } else if ( v < 55.5) {
        characteristic.updateValue(this.platform.Characteristic.AirQuality.INFERIOR);
      } else {
        characteristic.updateValue(this.platform.Characteristic.AirQuality.POOR);
      }
    }
  }

  @characteristicGetter(
    Characteristics.CurrentRelativeHumidity,
    Characteristics.CurrentAmbientLightLevel,
    Characteristics.PM2_5Density)
  getFloat(characteristic, _service, _IDs, properties) {
    const value = properties.value;
    if (value !== undefined && !isNaN(value)) {
      characteristic.updateValue(parseFloat(value));
    }
  }
}
