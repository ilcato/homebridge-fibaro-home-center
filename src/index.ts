// index.ts

import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { FibaroHC } from './platform';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, FibaroHC);
};
