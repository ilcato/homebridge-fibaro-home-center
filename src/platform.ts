import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { FibaroAccessory } from './fibaroAccessory';
import { FibaroClient } from './fibaro-api';
import { SetFunctions } from './setFunctions';
import { GetFunctions } from './getFunctions';
import { Poller } from './pollerupdate';
import { Mutex } from 'async-mutex';

const defaultPollerPeriod = 5;
const timeOffset = 2 * 3600;

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class FibaroHC implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  public updateSubscriptions: Array<unknown>;
  public poller?: Poller;
  public scenes: Record<string, string>;
  public climateZones: Record<string, string>;
  public info: Record<string, string>;
  public fibaroClient?: FibaroClient;
  public setFunctions?: SetFunctions;
  public getFunctions?: GetFunctions;
  public mutex;


  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.updateSubscriptions = [];
    this.scenes = {};
    this.climateZones = {};
    this.mutex = new Mutex();
    this.info = {};

    if (!config) {
      this.log.error('Fibaro HC configuration: cannot find configuration for the plugin');
      return;
    }
    let pollerPeriod = this.config.pollerperiod ? parseInt(this.config.pollerperiod) : defaultPollerPeriod;
    if (isNaN(pollerPeriod) || pollerPeriod < 0 || pollerPeriod > 100) {
      pollerPeriod = defaultPollerPeriod;
    }
    if (this.config.thermostattimeout === undefined) {
      this.config.thermostattimeout = timeOffset.toString();
    }
    if (this.config.switchglobalvariables === undefined) {
      this.config.switchglobalvariables = '';
    }
    if (this.config.dimmerglobalvariables === undefined) {
      this.config.dimmerglobalvariables = '';
    }
    if (this.config.securitysystem === undefined ||
      (this.config.securitysystem !== 'enabled' && this.config.securitysystem !== 'disabled')) {
      this.config.securitysystem = 'disabled';
    }
    if (this.config.FibaroTemperatureUnit === undefined) {
      this.config.FibaroTemperatureUnit = 'C';
    }
    if (this.config.addRoomNameToDeviceName === undefined) {
      this.config.addRoomNameToDeviceName = 'disabled';
    }

    this.fibaroClient = new FibaroClient(this.config.url, this.config.host, this.config.username, this.config.password, this.log);
    if (this.fibaroClient.status === false) {
      this.log.error('Cannot connect to Fibaro Home Center. Check credentials, url/host or ca.cer file');
      return;
    }
    if (pollerPeriod !== 0) {
      this.poller = new Poller(this, pollerPeriod);
    }

    this.getFunctions = new GetFunctions(this);

    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');

      if (!this.fibaroClient) {
        return;
      }

      try {
        this.info = (await this.fibaroClient.getInfo()).body;
        const scenes = (await this.fibaroClient.getScenes()).body;
        scenes.map((s) => {
          this.scenes[s.name] = s.id;
          if (s.name.startsWith('_')) {
            const device = { name: s.name.substring(1), roomID: 0, id: s.id, type: 'scene' };
            this.addAccessory(device, null);
          }
        });
        const respClimateZones = (await this.fibaroClient.getClimateZones());
        if (respClimateZones.status === 200) {
          const climateZones = respClimateZones.body;
          climateZones.map((s) => {
            this.climateZones[s.name] = s.id;
            const device = { name: s.name, roomID: 0, id: s.id, type: 'climateZone', properties: s.properties };
            this.addAccessory(device, null);
          });
        } else {
          const respHeatingZones = (await this.fibaroClient.getHeatingZones());
          if (respHeatingZones.status === 200) {
            const heatingZones = respHeatingZones.body;
            heatingZones.map((s) => {
              this.climateZones[s.name] = s.id;
              const device = { name: s.name, roomID: 0, id: s.id, type: 'heatingZone', properties: s.properties };
              this.addAccessory(device, null);
            });
          }
        }
        this.setFunctions = new SetFunctions(this);	// There's a dependency in setFunction to Scene Mapping
        const devices = this.fibaroClient ? (await this.fibaroClient.getDevices()).body : {};
        let rooms = null;
        if (this.config.addRoomNameToDeviceName === 'enabled' && this.fibaroClient) {
          rooms = (await this.fibaroClient.getRooms()).body;
        }
        this.LoadAccessories(devices, rooms);
      } catch (e) {
        this.log.error('Error getting data from Home Center: ', e);
        throw e;
      }
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    // To enable the removing of cached accessories no more present on Fibaro Home Center
    accessory.context.reviewed = false;
    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  LoadAccessories(devices, rooms) {
    this.log.info('Loading accessories');
    devices.map((s, i, a) => {
      if (s.visible === true && !s.name.startsWith('_')) {
        const siblings = this.findSiblingDevices(s, a);
        if (rooms !== null) {
          // patch device name
          const room = rooms.find(r => r.id === s.roomID);
          s.name = s.name + ' - ' + (room !== null ? room.name : 'no-room');
        }
        this.addAccessory(s, siblings);
      }
    });

    // Create Global Variable Switches and Dimmers
    const createGlobalVariableDevices = (param, type) => {
      if (param && param !== '') {
        const globalVariables = param.split(',');
        for (let i = 0; i < globalVariables.length; i++) {
          const device = { name: globalVariables[i], roomID: 0, id: 0, type: type };
          this.addAccessory(device, null);
        }
      }
    };
    createGlobalVariableDevices(this.config.switchglobalvariables, 'G');
    createGlobalVariableDevices(this.config.dimmerglobalvariables, 'D');


    // Create Security System accessory
    if (this.config.securitysystem === 'enabled') {
      const device = { name: 'FibaroSecuritySystem', roomID: 0, id: 0, type: 'securitySystem' };
      this.addAccessory(device, null);
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

  addAccessory(device, sibling) {
    if (device === undefined) {
      return;
    }
    const uuid = this.api.hap.uuid.generate(device.name + device.roomID);
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    if (existingAccessory) {
      // the accessory already exists
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

      // Update context
      existingAccessory.context.device = device;
      existingAccessory.context.reviewed = true;

      this.api.updatePlatformAccessories([existingAccessory]);

      // Create accessory handler
      new FibaroAccessory(this, existingAccessory, device, sibling);

    } else {
      // the accessory does not yet exist, so we need to create it
      const accessory = new this.api.platformAccessory(device.name, uuid);

      // Create context
      accessory.context.device = device;
      accessory.context.reviewed = true;

      // Create accessory handler
      const fa = new FibaroAccessory(this, accessory, device, sibling);
      if (fa.isValid) {
        // link the accessory to the platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

        this.accessories.push(accessory);
        this.log.info('Adding new accessory:', device.name);
      }
    }
  }

  removeAccessory(accessory) {
    this.log.info('Remove accessory: ', accessory.displayName);
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    this.accessories.forEach((element, index) => {
      if (element.UUID === accessory.uuid) {
        this.accessories.splice(index, 1);
      }
    });
  }

  findSiblingDevices(device, devices) {
    const siblings = new Map<string, unknown>();

    devices.map((s) => {
      if (s.visible === true && s.name.charAt(0) !== '_') {
        if (device.parentId === s.parentId && device.id !== s.id) {
          siblings.set(s.type, s);
        }
      }
    });

    return siblings;
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
      (this.info.serialNumber.indexOf('HC2-') === 0 || this.info.serialNumber.indexOf('HLC-') === 0);
  }

}
