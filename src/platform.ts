// platform.ts

import {
  API,
  APIEvent,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge';

import { FibaroAccessory } from './fibaroAccessory';
import { FibaroClient } from './fibaro-api';
import { SetFunctions } from './setFunctions';
import { GetFunctions } from './getFunctions';
import * as constants from './constants';
import { Poller } from './pollerupdate';


/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class FibaroHC implements DynamicPlatformPlugin {
  public readonly Service = this.api.hap.Service;
  public readonly Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  public updateSubscriptions: Array<unknown> = [];
  public poller?: Poller;
  public scenes: Record<string, string> = {};
  public climateZones: Record<string, string> = {};
  public info: Record<string, string> = {};
  public fibaroClient?: FibaroClient;
  public setFunctions?: SetFunctions;
  public getFunctions?: GetFunctions;
  public loginTimeout: NodeJS.Timeout | null = null;
  public rooms: { id: number; name: string }[] = [];

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    if (!this.setupConfig()) {
      return;
    }
    this.initializeFibaroClient();

    if (this.config.pollerperiod > 0) {
      this.poller = new Poller(this, this.config.pollerperiod);
    }

    this.getFunctions = new GetFunctions(this);

    this.log.debug('Finished initializing platform:', this.config.name);

    api.on(APIEvent.DID_FINISH_LAUNCHING, async () => {
      log.debug('Executed didFinishLaunching callback');
      this.login();
    });
  }

  private setupConfig() : boolean {
    if (!this.config) {
      this.log.error('Fibaro HC configuration: cannot find configuration for the plugin');
      return false;
    }
    this.setupPollerPeriod();
    this.setupThermostatMaxTemp();
    this.setupDefaultConfigValues();
    this.setupUrl();
    return true;
  }

  private setupPollerPeriod() {
    let pollerPeriod = this.config.pollerperiod;
    if (pollerPeriod === undefined) {
      pollerPeriod = constants.DEFAULT_POLLER_PERIOD;
    } else {
      const parsedValue = typeof pollerPeriod === 'string' ? parseFloat(pollerPeriod) : pollerPeriod;
      if (isNaN(parsedValue) || parsedValue < 0 || parsedValue > 100) {
        pollerPeriod = constants.DEFAULT_POLLER_PERIOD;
      } else {
        pollerPeriod = parsedValue;
      }
    }
    this.config.pollerperiod = pollerPeriod;
  }

  private setupThermostatMaxTemp() {
    const thermostatMaxTemp = this.config.thermostatmaxtemperature ?
      parseInt(this.config.thermostatmaxtemperature) :
      constants.DEFAULT_THERMOSTAT_MAX_TEMP;
    if (isNaN(thermostatMaxTemp) || thermostatMaxTemp < 0 || thermostatMaxTemp > constants.DEFAULT_THERMOSTAT_MAX_TEMP) {
      this.config.thermostatmaxtemperature = constants.DEFAULT_THERMOSTAT_MAX_TEMP;
    }
  }

  private setupDefaultConfigValues() {
    this.config.markDeadDevices = this.config.markDeadDevices ?? false;
    this.config.thermostattimeout = this.config.thermostattimeout ?? constants.TIME_OFFSET.toString();
    this.config.switchglobalvariables = this.config.switchglobalvariables ?? '';
    this.config.dimmerglobalvariables = this.config.dimmerglobalvariables ?? '';
    this.config.securitysystem = this.config.securitysystem === 'enabled' ? 'enabled' : 'disabled';
    this.config.FibaroTemperatureUnit = this.config.FibaroTemperatureUnit ?? 'C';
    this.config.addRoomNameToDeviceName = this.config.addRoomNameToDeviceName ?? 'disabled';
    this.config.logsLevel = this.config.logsLevel ?? '1';
    this.config.doorbellDeviceId = this.config.doorbellDeviceId ?? '0';
  }

  private setupUrl() {
    if (validUrl(this.config.url)) {
      this.config.url = this.config.url.startsWith('http') ? this.config.url : 'http://' + this.config.url;
    } else if (validUrl(this.config.host)) {
      this.config.url = this.config.host.startsWith('http') ? this.config.host : 'http://' + this.config.host;
    } else {
      this.log.error('Fibaro HC configuration: cannot find valid url in configuration file.');
      throw new Error('Invalid URL configuration');
    }
  }

  private initializeFibaroClient() {
    this.fibaroClient = new FibaroClient(
      this.config.url,
      this.config.username,
      this.config.password,
      this.log,
      this.config.adminUsername,
      this.config.adminPassword,
    );

    if (!this.fibaroClient || this.fibaroClient.status === false) {
      this.log.error('Cannot connect to Fibaro Home Center. Check credentials, url or ca.cer file');
      throw new Error('Failed to initialize Fibaro Client');
    }
  }

  async login() {
    try {
      if (!this.fibaroClient) {
        return;
      }
      this.info = (await this.fibaroClient.getInfo()).body;
      const { body: scenes } = await this.fibaroClient.getScenes();
      scenes.map((s) => {
        this.scenes[s.name] = s.id;
        if (s.name.startsWith('_')) {
          const device = { name: s.name.substring(1), roomID: 0, id: s.id, type: 'scene' };
          this.addAccessory(device);
        }
      });
      if (this.isOldApi()) {
        const { body: heatingZones } = await this.fibaroClient.getHeatingZones();
        heatingZones.map((s) => {
          this.climateZones[s.name] = s.id;
          const device = { name: s.name, roomID: 0, id: s.id, type: 'heatingZone', properties: s.properties };
          this.addAccessory(device);
        });
      } else {
        const { body: climateZones } = await this.fibaroClient.getClimateZones();
        climateZones.map((s) => {
          this.climateZones[s.name] = s.id;
          const device = { name: s.name, roomID: 0, id: s.id, type: 'climateZone', properties: s.properties };
          this.addAccessory(device);
        });
      }
      this.setFunctions = new SetFunctions(this);	// There's a dependency in setFunction to Scene Mapping
      const devices = this.fibaroClient ? (await this.fibaroClient.getDevices()).body : {};
      this.rooms = (await this.fibaroClient.getRooms()).body;
      this.LoadAccessories(devices);
      this.log.info('Successfully logged in.');
    } catch (e) {
      this.log.error('Error getting data from Home Center: ', e);
      this.log.error('Make sure you provide the correct data: URL or IP, username and password'
                     + ' and that HC is enabled and available on the same network as Homebridge.'
                     + ' Using https may be mandatory if you configured HC to use it.');
      this.log.error('Next try in 5 minutes');
      if (this.loginTimeout) {
        clearTimeout(this.loginTimeout);
      }
      this.loginTimeout = setTimeout(() => {
        this.login();
      }, 300000);
    }
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    if (this.config.logsLevel === constants.CONFIG_LOGS_LEVEL_VERBOSE){
      this.log.info('Loading accessory from cache:', accessory.displayName);
    }
    // To enable the removing of cached accessories no more present on Fibaro Home Center
    accessory.context.reviewed = false;
    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  LoadAccessories(devices) {
    this.log.debug('Loading accessories');
    devices.map((s) => {
      if (s.visible === true && !s.name.startsWith('_')) {
        if (this.config.addRoomNameToDeviceName === 'enabled' && this.rooms) {
          // patch device name with the room name
          const room = this.getRoomNameById(s.roomID);
          if (room !== undefined && room !== '') {
            s.name = s.name + ' - ' + room;
          } else {
            s.name = s.name + ' - ' + 'no-room';
          }
        } else if (this.config.addRoomNameToDeviceName === 'enabledBefore' && this.rooms) {
          // patch device name with the room name
          const room = this.getRoomNameById(s.roomID);
          if (room !== undefined && room !== '') {
            s.name = room + ' ' + s.name;
          }
        }
        this.addAccessory(s);
      }
    });

    // Create Global Variable Switches and Dimmers
    const createGlobalVariableDevices = (param, type) => {
      if (param && param !== '') {
        const globalVariables = param.split(',');
        for (let i = 0; i < globalVariables.length; i++) {
          const device = { name: globalVariables[i], roomID: 0, id: globalVariables[i], type: type };
          this.addAccessory(device);
        }
      }
    };
    createGlobalVariableDevices(this.config.switchglobalvariables, 'G');
    createGlobalVariableDevices(this.config.dimmerglobalvariables, 'D');

    // Create Security System accessory
    if (this.config.securitysystem === 'enabled') {
      const device = { name: 'FibaroSecuritySystem', roomID: 0, id: 0, type: 'securitySystem' };
      this.addAccessory(device);
    }

    // Remove not reviewd accessories: cached accessories no more present in Home Center
    this.accessories.forEach((a) => {
      if (!a.context.reviewed) {
        this.removeAccessory(a);
      }
    });

    // Start the poller update mechanism
    if (this.poller) {
      this.poller.poll();
    }
  }

  addAccessory(device) {
    if (device === undefined) {
      return;
    }
    const uuidV1 = this.api.hap.uuid.generate(device.name + device.roomID);
    // add a new seed for uuidV2 to avoid conflicts with devices with same name in same room
    // manage collision with climate/heating zones (id starting from 1)
    const seed = device.id.toString() + ((device.type==='heatingZone' || device.type==='climateZone') ? 'hc' : '');
    const uuidV2 = this.api.hap.uuid.generate(seed);
    // check if the accessory already exists based on old uuid seed (device.name + device.roomID)
    // if yes, keep it to preserve compatibility with HomeKit automations
    // if not, check if the accessory already exists based on new uuid seed (device.id)
    // if not, create a new accessory with new uuid seed (device.id)
    const existingAccessoryV1 = this.accessories.find(accessory => accessory.UUID === uuidV1);
    const existingAccessoryV2 = this.accessories.find(accessory => accessory.UUID === uuidV2);
    const existingAccessory = existingAccessoryV1 ? existingAccessoryV1 : existingAccessoryV2;
    if (existingAccessory) {
      // the accessory already exists
      if (this.config.logsLevel === constants.CONFIG_LOGS_LEVEL_VERBOSE){
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
      }

      // Update context
      existingAccessory.context.device = device;
      existingAccessory.context.reviewed = true;

      this.api.updatePlatformAccessories([existingAccessory]);

      // Create accessory handler
      const fa = new FibaroAccessory(this, existingAccessory, device);
      if (!fa.isValid) {
        this.removeAccessory(existingAccessory);
      }

    } else {
      // the accessory does not yet exist, so we need to create it
      const accessory = new this.api.platformAccessory(device.name, uuidV2);

      // Create context
      accessory.context.device = device;
      accessory.context.reviewed = true;

      // Create accessory handler
      const fa = new FibaroAccessory(this, accessory, device);
      if (fa.isValid) {
        // link the accessory to the platform
        this.api.registerPlatformAccessories(constants.PLUGIN_NAME, constants.PLATFORM_NAME, [accessory]);

        this.accessories.push(accessory);
        this.log.info('Adding new accessory:', device.name);
      }
    }
  }

  removeAccessory(accessory) {
    this.log.info('Remove accessory: ', accessory.displayName);
    this.api.unregisterPlatformAccessories(constants.PLUGIN_NAME, constants.PLATFORM_NAME, [accessory]);
    this.accessories.forEach((element, index) => {
      if (element.UUID === accessory.uuid) {
        this.accessories.splice(index, 1);
      }
    });
  }

  findServiceByName(name, service) {
    const a = this.accessories.find((accessory) => {
      const s = accessory.getService(service);
      if (s && s.displayName === name) {
        return true;
      } else {
        return false;
      }
    });
    if (a) {
      return a.getService(service);
    } else {
      return undefined;
    }
  }

  isOldApi() {
    return this.info && this.info.serialNumber &&
      (this.info.serialNumber.indexOf('HC2-') === 0 || this.info.serialNumber.indexOf('HCL-') === 0);
  }

  getRoomNameById(roomId: number): string | undefined {
    return this.rooms.find(r => r.id === roomId)?.name;
  }

}

function validUrl(str) {
  const pattern = new RegExp(
    '^(https?:\\/\\/)?' + // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
      '(\\#[-a-z\\d_]*)?$', // fragment locator
    'i',
  );
  return pattern.test(str);
}
