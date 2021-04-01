# homebridge-fibaro-hc3
[![npm version](https://badge.fury.io/js/homebridge-fibaro-hc3.svg)](https://badge.fury.io/js/homebridge-fibaro-hc3)
[![Downloads](https://img.shields.io/npm/dt/homebridge-fibaro-hc3)](https://www.npmjs.com/package/homebridge-fibaro-hc3)
[![Homebridge Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/38Dpux)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

[![Buy me a cofee](https://cdn.buymeacoffee.com/buttons/default-orange.png)](https://www.buymeacoffee.com/ilcato)

Homebridge plugin for Fibaro Home Center 3

# Installation
Follow the instruction in [homebridge](https://www.npmjs.com/package/homebridge) for the homebridge server installation.
The plugin is published through [NPM](https://www.npmjs.com/package/homebridge-fibaro-hc3) and should be installed "globally" by typing:

    npm install -g homebridge-fibaro-hc3
    
# Configuration
Remember to configure the plugin in config.json in your home directory inside the .homebridge directory. Configuration parameters:
+ "url": "PUT URL OF YOUR HC3 HERE CONTAINING PROTOCOL AND NAME, E.G.: https://hc3-00000XXX.local, ca.cer file in the same folder as config.json"
+ "host": "PUT IP ADDRESS OF YOUR HC3 HERE. IF URL PARAMETER IS PRESENT THIS PARAMETER IS IGNORED"
+ "username": "PUT USERNAME OF YOUR HC3 HERE"
+ "password": "PUT PASSWORD OF YOUR HC3 HERE"
+ "pollerperiod": "PUT 0 FOR DISABLING POLLING, 1 - 100 INTERVAL IN SECONDS. 2 SECONDS IS THE DEFAULT"
+ "thermostattimeout": "PUT THE NUMBER OF SECONDS FOR THE THERMOSTAT TIMEOUT, DEFAULT: 7200 (2 HOURS)
+ "switchglobalvariables": "PUT A COMMA SEPARATED LIST OF HOME CENTER GLOBAL VARIABLES ACTING LIKE A BISTABLE SWITCH"
+ "securitysystem": "PUT enabled OR disabled IN ORDER TO MANAGE THE AVAILABILITY OF THE SECURITY SYSTEM"
+ "addRoomNameToDeviceName" : "PUT enabled OR disabled IN ORDER TO ADD THE ROOM NAME TO DEVIVE NAME. DEFAULT disabled"

Look for a sample config in [config.json example](https://github.com/ilcato/homebridge-Fibaro-hc3/blob/master/config.json)


# Last release note
Version 1.1.12
+ Fix Global variables set issue
