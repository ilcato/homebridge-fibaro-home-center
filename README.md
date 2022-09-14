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
+ "thermostattimeout": "PUT THE NUMBER OF SECONDS FOR THE THERMOSTAT TIMEOUT, DEFAULT: 7200 (2 HOURS)
+ "switchglobalvariables": "PUT A COMMA SEPARATED LIST OF HOME CENTER GLOBAL VARIABLES ACTING LIKE A BISTABLE SWITCH"
+ "dimmerglobalvariables": "PUT A COMMA SEPARATED LIST OF HOME CENTER GLOBAL VARIABLES ACTING LIKE A DIMMER"
+ "securitysystem": "PUT enabled OR disabled IN ORDER TO MANAGE THE AVAILABILITY OF THE SECURITY SYSTEM"
+ "addRoomNameToDeviceName" : "PUT enabled OR disabled IN ORDER TO ADD THE ROOM NAME TO DEVICE NAME. DEFAULT disabled"
+ "doorbellDeviceId" : "PUT HOME CENTER BINARY SENSOR DEVICE ID ACTING AS A DOORBELL"

Look for a sample config in [config.json example](https://github.com/ilcato/homebridge-Fibaro-home-center/blob/master/config.json)


# Last release notes
Version 1.2.10
+ Fix service type for Wall Socket binarySwitch #114

