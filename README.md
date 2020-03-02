# homebridge-fibaro-hc3 [![npm version](https://badge.fury.io/js/homebridge-fibaro-hc3.svg)](https://badge.fury.io/js/homebridge-fibaro-hc3)
Homebridge plugin for Fibaro Home Center 3

# Installation
Follow the instruction in [homebridge](https://www.npmjs.com/package/homebridge) for the homebridge server installation.
The plugin is published through [NPM](https://www.npmjs.com/package/homebridge-fibaro-hc3) and should be installed "globally" by typing:

    npm install -g homebridge-fibaro-hc3
    
# Configuration
Remember to configure the plugin in config.json in your home directory inside the .homebridge directory. Configuration parameters:
+ "host": "PUT IP ADDRESS OF YOUR HC3 HERE"
+ "username": "PUT USERNAME OF YOUR HC3 HERE"
+ "password": "PUT PASSWORD OF YOUR HC3 HERE"
+ "pollerperiod": "PUT 0 FOR DISABLING POLLING, 1 - 100 INTERVAL IN SECONDS. 2 SECONDS IS THE DEFAULT"

Look for a sample config in [config.json example](https://github.com/ilcato/homebridge-Fibaro-hc3/blob/master/config.json)


# Release notes
Version 0.0.4
+ Removed thermostats devices: waiting for API documentation

Version 0.0.3
+ Fix security system
+ Fix Brightness control

Version 0.0.2
+ Added support for thermostat
+ Added support for enablecoolingstatemanagemnt
+ Added support for global variable based switches
+ Added support for Harmony devices
+ Added support for Security system

Version 0.0.1
+ Initial version.
+ Support only for basic devices
