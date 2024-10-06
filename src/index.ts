// index.ts

import { API } from 'homebridge';

import { PLATFORM_NAME } from './constants';
import { FibaroHC } from './platform';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, FibaroHC);
};
