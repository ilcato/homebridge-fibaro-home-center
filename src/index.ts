// index.ts

import { API } from 'homebridge';

import { PLATFORM_NAME } from './constants';
import { FibaroHC } from './platform';

export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, FibaroHC);
};
