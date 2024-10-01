// constants.ts

// API constants
export const API_URL_INFO = '/api/settings/info';
export const API_URL_SCENES = '/api/scenes';
export const API_URL_CLIMATE = '/api/panels/climate';
export const API_URL_HEATING = '/api/panels/heating';
export const API_URL_ROOMS = '/api/rooms';
export const API_URL_DEVICES = '/api/devices';
export const API_URL_REFRESH_STATES = '/api/refreshStates';
export const API_URL_GLOBAL_VARIABLES = '/api/globalVariables';
export const DEFAULT_THROTTLE_RATE = 100;
export const DEFAULT_THROTTLE_RATE_PER = 1000;
export const DEFAULT_THROTTLE_CONCURRENT = 50;

export const CERTIFICATE_FILE_NAME = 'ca.cer';
export const CERTIFICATE_PATHS = [
  '/homebridge/ca.cer',
  '~/.homebridge/ca.cer',
];

export const HTTP_ACCEPT_HEADER = 'json';

// Security system constant
export const SECURITY_SYSTEM_GLOBAL_VARIABLE = 'SecuritySystem';

// Device control types
export const CONTROL_TYPE_LIGHTING = 2;
export const CONTROL_TYPE_BEDSIDE_LAMP = 5;
export const CONTROL_TYPE_WALL_LAMP = 7;
export const CONTROL_TYPE_OTHER_DEVICE = 1;
export const CONTROL_TYPE_OTHER_DEVICE_ALT = 20;
export const CONTROL_TYPE_LIGHTING_ALT = 23;
export const CONTROL_TYPE_VIDEO_INTERCOM = 24;
export const CONTROL_TYPE_VIDEO_GATE_OPEN = 25;
export const CONTROL_TYPE_SPRINKLER = 3;
export const CONTROL_TYPE_VALVE = 26;
export const CONTROL_TYPE_GATE_WITH_POSITIONING = 57;
export const CONTROL_TYPE_GARAGE_DOOR = 56;
export const CONTROL_TYPE_BLINDS_WITH_POSITIONING = 55;

// Device roles
export const DEVICE_ROLE_TEMPERATURE_SENSOR = 'TemperatureSensor';
export const DEVICE_ROLE_HUMIDITY_SENSOR = 'HumiditySensor';
export const DEVICE_ROLE_LIGHT_SENSOR = 'LightSensor';
export const DEVICE_ROLE_MULTILEVEL_SENSOR = 'MultilevelSensor';
export const DEVICE_ROLE_MOTION_SENSOR = 'MotionSensor';
export const DEVICE_ROLE_PRESENCE_SENSOR = 'PresenceSensor';

// Device types
export const DEVICE_TYPE_SECURITY_SYSTEM = 'securitySystem';
export const DEVICE_TYPE_SCENE = 'scene';
export const DEVICE_TYPE_CLIMATE_ZONE = 'climateZone';
export const DEVICE_TYPE_HEATING_ZONE = 'heatingZone';
export const DEVICE_TYPE_GLOBAL_VARIABLE = 'G';
export const DEVICE_TYPE_DIMMER_GLOBAL_VARIABLE = 'D';

// Service subtypes
export const SUBTYPE_LOCK = 'LOCK';
export const SUBTYPE_SCENE = 'SC';
export const SUBTYPE_CLIMATE_ZONE = 'CZ';
export const SUBTYPE_HEATING_ZONE = 'HZ';
export const SUBTYPE_OPEN_CLOSE_ONLY = 'OPENCLOSEONLY';
export const SUBTYPE_PM2_5 = 'PM2_5';

// Configuration
export const CONFIG_LOGS_LEVEL_VERBOSE = 2;
export const CONFIG_FIBARO_TEMPERATURE_UNIT_FAHRENHEIT = 'F';
export const CONFIG_FIBARO_TEMPERATURE_UNIT_CELSIUS = 'C';

// Manual device types
export const MANUAL_DEVICE_TYPES = {
  SWITCH: 'switch',
  DIMMER: 'dimmer',
  BLIND: 'blind',
  BLIND_WITH_TILT: 'blind2',
  GARAGE: 'garage',
  TEMPERATURE: 'temperature',
  HUMIDITY: 'humidity',
  LIGHT_SENSOR: 'lightSensor',
  MOTION: 'motion',
  LEAK: 'leak',
  SMOKE: 'smoke',
} as const;