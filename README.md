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
Remember to configure the plugin in config.json in your home directory inside the .homebridge directory. Configuration parameters:
+ "url": "PUT URL OF YOUR HOME CENTER HERE CONTAINING PROTOCOL AND NAME, E.G.: https://hc-00000XXX.local, ca.cer file in the same folder as config.json"
+ "host": "PUT IP ADDRESS OF YOUR HOME CENTER HERE. IF URL PARAMETER IS PRESENT THIS PARAMETER IS IGNORED"
+ "username": "PUT USERNAME OF YOUR HOME CENTER HERE"
+ "password": "PUT PASSWORD OF YOUR HOME CENTER HERE"
+ "pollerperiod": "PUT 0 FOR DISABLING POLLING, 1 - 100 INTERVAL IN SECONDS. 2 SECONDS IS THE DEFAULT"
+ "thermostatmaxtemperature": "SET MAX TEMPERATURE FOR THERMOSTATIC DEVICES (DEFAULT 100C)"
+ "thermostattimeout": "PUT THE NUMBER OF SECONDS FOR THE THERMOSTAT TIMEOUT, DEFAULT: 7200 (2 HOURS)
+ "switchglobalvariables": "PUT A COMMA SEPARATED LIST OF HOME CENTER GLOBAL VARIABLES ACTING LIKE A BISTABLE SWITCH"
+ "dimmerglobalvariables": "PUT A COMMA SEPARATED LIST OF HOME CENTER GLOBAL VARIABLES ACTING LIKE A DIMMER"
+ "securitysystem": "PUT enabled OR disabled IN ORDER TO MANAGE THE AVAILABILITY OF THE SECURITY SYSTEM"
+ "addRoomNameToDeviceName" : "PUT enabled OR disabled IN ORDER TO ADD THE ROOM NAME TO DEVICE NAME. DEFAULT disabled"
+ "doorbellDeviceId" : "PUT HOME CENTER BINARY SENSOR DEVICE ID ACTING AS A DOORBELL"
+ "logsLevel": "PUT THE DESIRED LOG LEVEL: 0 DISABLED, 1 ONLY CHANGES, 2 ALL"
+ "advControl": "ENABLE IF YOU WANT THE DEVICE TYPE IN HOMEKIT TO DEPEND ON HOW THE DEVICE ROLE IN FIBARO IS SELECTED. 0-DISABLED, 1-ENABLED"

# Links
+ Sample config: [config.json example](https://github.com/ilcato/homebridge-Fibaro-home-center/blob/main/config.json)
+ Advanced Control: [Advanced Control](https://github.com/ilcato/homebridge-Fibaro-home-center/blob/main/advcontrol.md)
+ Wiki: [Wiki](https://github.com/ilcato/homebridge-Fibaro-home-center/wiki)

# Troubleshooting
## The device is displayed incorrectly or doesn't display at all
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
