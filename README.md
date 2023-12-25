# homebridge-fibaro-home-center
[![npm version](https://badge.fury.io/js/homebridge-fibaro-home-center.svg)](https://badge.fury.io/js/homebridge-fibaro-home-center)
[![Downloads](https://img.shields.io/npm/dt/homebridge-fibaro-home-center)](https://www.npmjs.com/package/homebridge-fibaro-home-center)
[![Homebridge Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/38Dpux)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

[![Buy me a cofee](https://cdn.buymeacoffee.com/buttons/default-orange.png)](https://www.buymeacoffee.com/ilcato)

Homebridge plugin for Fibaro Home Center (2, 2 Lite, 3, 3 Lite, Yubii Home)

# Installation
Follow the instruction in [homebridge](https://www.npmjs.com/package/homebridge) for the homebridge server installation.
The plugin is published through [NPM](https://www.npmjs.com/package/homebridge-fibaro-home-center) and should be installed "globally" by typing:

    npm install -g homebridge-fibaro-home-center
    
# Configuration
Configure the plugin through the settings UI or directly in the JSON editor.

#### Required:
Required: url or host, username and password
+ `url` : url of your Home Center / Yubii Home, containing protocol and name, E.G.: https://hc-00000XXX.local, if starts with https:// put ca.cer file in the same folder as config.json
+ `host` : IP address of your Home Center / Yubii Home, E.G.: 192.168.1.100 , host field is ignored if field `url` is filled
+ `username` : username of your Home Center / Yubii Home
+ `password` : password of your Home Center / Yubii Home

#### Optional:
+ `pollerperiod` : 0 for disabling polling, 1 - 100 interval in seconds, 2 seconds is the default
+ `thermostatmaxtemperature` : set max temperature for thermostatic devices (default 100 C)
+ `thermostattimeout` : number of seconds for the thermostat timeout, default: 7200 (2 hours)
+ `switchglobalvariables` : comma separated list of home center global variables acting like a bistable switch
+ `dimmerglobalvariables` : comma separated list of home center global variables acting like a dimmer
+ `securitysystem` : enabled or disabled in order to manage the availability of the security system
+ `addroomnametodevicename` : enabled or disabled in order to add the room name to device name. default disabled
+ `doorbelldeviceid` : home center binary sensor device id acting as a doorbell
+ `logslevel` : desired log level: 0 disabled, 1 only changes, 2 all
+ `advcontrol` : enable if you want the device type in homekit to depend on how the device role in fibaro is selected. 0-disabled, 1-enabled

# Links
+ Sample config: [config.json example](https://github.com/ilcato/homebridge-Fibaro-home-center/blob/main/docs/config.json)
+ Advanced Control: [Advanced Control](https://github.com/ilcato/homebridge-Fibaro-home-center/blob/main/docs/advcontrol.md)
+ Wiki: [Wiki](https://github.com/ilcato/homebridge-Fibaro-home-center/wiki)

# Troubleshooting
### The device is displayed incorrectly or doesn't display at all
+ For some devices, responsible for the display method is field Role (for a given device in the Fibaro Panel). Check [Advanced Control](https://github.com/ilcato/homebridge-Fibaro-home-center/blob/main/advcontrol.md).
+ If device still displays incorrectly (e.g. as Switch but should be Outlet) or doubled (one device is displayed as two), you must remove this device from cache (in Homebridge Settings). Unfortunately, in this case, the settings for this device will most likely be lost (room selection, automations, etc.).
+ Every change of devices display type (e.g. from Switch to Outlet etc.) can make it display incorrectly (like doubled). It is recommended to turn off Apple hubs during changes.
+ If you want new device to be supported (or if it displays incorrectly despite the recommendation above) open new Issue and write: what is this product, as what should it be displayed, whether it does not display at all or displays incorrectly (as what device?), what version of this plugin, what Home Center, and attach the API response for this product (see below).
### Get API response for device
+ How to get API response for device. Open in browser: http://FIBARO-IP/api/devices/ID (replace FIBARO-IP with your Home Center IP and ID with device ID) and login.
### Exclude devices
+ If You want to exclude one or more devices: use a specific user (not an admin one) and grant access to only the needed devices or rename the device you want to exclude with an initial _ character. Warning: If you exclude the device, adding it again will require reconfiguration (assignment to a room, automations, etc.).
### Important
+ Use different device names within the same room in Home Center.

# Latest release notes

## Version 1.5.1
+ Fix bug causing endless rastarting Homebridge when unable to connect to Home Center / Yubii Home
+ Adding a delay (1 minute) in the next attempt to read data (in case of failure)
+ Adding a delay (5 minutes) in the next attempt to first login (in case of failure)
+ Fix bug in the dimmers
+ Added the ability to select in the config thermostat max temperature

## Version 1.5.0
+ New option to enable in plugin settings: Advanced Control. Enable it if you want the device type in Homekit to depend on how the device role in Fibaro is selected. Details: [Advanced Control page](https://github.com/ilcato/homebridge-Fibaro-home-center/blob/master/advcontrol.md).
+ New settings view: divided into sections.
