<img src="https://raw.githubusercontent.com/homebridge/verified/latest/icons/homebridge-fibaro-home-center.png" width="100px"></img>
# homebridge-fibaro-home-center

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![Downloads](https://img.shields.io/npm/dt/homebridge-fibaro-home-center)](https://www.npmjs.com/package/homebridge-fibaro-home-center)
[![Homebridge Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/38Dpux)

[![GitHub version](https://img.shields.io/github/package-json/v/ilcato/homebridge-fibaro-home-center?label=GitHub)](https://github.com/ilcato/homebridge-fibaro-home-center/releases/)
[![npm version](https://img.shields.io/npm/v/homebridge-fibaro-home-center?color=%23cb3837&label=npm)](https://www.npmjs.com/package/homebridge-fibaro-home-center)

[![Buy me a cofee](https://cdn.buymeacoffee.com/buttons/default-orange.png)](https://www.buymeacoffee.com/ilcato)

### Homebridge plugin for Fibaro Home Center (2, 2 Lite, 3, 3 Lite, Yubii Home).

Supports devices, scenes, global variables, security systems, climate / heating zones and exposes them to Homebridge and HomeKit (Apple Home and more).

# How it works

This plugin comunicates with Fibaro HC / Yubii Home by the official Fibaro API. Homebridge and HC / Yubii Home should be in the same local network with the same IP address range (same subnet), E.G. 192.168.1.XXX. 

You must have an account in HC / Yubii Home. The main account has access to all devices, scenes, etc., for additional accounts you can select what to share.

Results will appear in Homebridge and via HomeKit in your Apple Home app (or other HomeKit app).

# Installation

This plugin can be easily installed and configured through Homebridge UI or via [NPM](https://www.npmjs.com/package/homebridge-fibaro-home-center) "globally" by typing:

    npm install -g homebridge-fibaro-home-center
    
# Configuration
Configure the plugin through the settings UI or directly in the JSON editor.

#### Required:
+ `url` : url or IP of your Home Center / Yubii Home. Using https may be mandatory if you configured HC to use it. Examples:
  + `192.168.1.100` - replace with your IP
  + `https://hc-00000XXX.local` - replace with your HC serial, get ca.cer file from HC and put it in Homebridge in same folder as config.json
  + `http://hc-00000XXX.local` - replace with your HC serial
+ `username` : username of your Home Center / Yubii Home
+ `password` : password of your Home Center / Yubii Home

#### Optional:
+ `pollerperiod` : Polling interval (refresh interval) for querying Fibaro Home Center (0: disabled, recomended: 3, 1 or 2 seconds allows for a more responsive update of the Home app when changes appear outside the HomeKit environment). If it is disabled the Home app is not updated automatically when such a change happen but only when you close a panel and reopen it. Enabling this option is useful to read the new state when controlling devices outside HomeKit, E.G.: via Fibaro, physical buttons, scenes and automations.
+ `thermostatmaxtemperature` : set max temperature for thermostatic devices (default 100 C)
+ `thermostattimeout` : number of seconds for the thermostat timeout, default: 7200 (2 hours)
+ `switchglobalvariables` : comma separated list of home center global variables acting like a bistable switch
+ `dimmerglobalvariables` : comma separated list of home center global variables acting like a dimmer
+ `adminUsername`: admin username of your home center, needed only to set global variables,
+ `adminPassword`: admin password of your home center, needed only to set global variables,
+ `securitysystem` : enabled or disabled in order to manage the availability of the security system
+ `addRoomNameToDeviceName` : If enabled, to each device name will be added the name of the room in which it is located. Default: disabled.
+ `doorbellDeviceId` : home center binary sensor device id acting as a doorbell
+ `logsLevel` : desired log level: 0 disabled, 1 only changes, 2 all
+ `advControl` : enable if you want the device type in homekit to depend on how the device role in fibaro is selected. 0-disabled, 1-enabled

#### Example: [config.json](https://github.com/ilcato/homebridge-Fibaro-home-center/blob/main/docs/config.json)

# Manuals

<details>
<summary><b>Advanced Control</b></summary>

If you want the device type in Homekit to depend on how the device role in Fibaro is selected enable this option. See details: [advanced control](https://github.com/ilcato/homebridge-Fibaro-home-center/blob/main/docs/advcontrol.md)

</details>



<details>
<summary><b>Exclude devices</b></summary>

Exclude one or more devices:
+ use a specific user (not an admin one) and grant access to only the needed devices
+ or rename the device you want to exclude with an initial _ character.

Warning: If you exclude the device, adding it again will require reconfiguration (assignment to a room, automations, etc.).

</details>

<details>
<summary><b>Scenes</b></summary>

+ Any scene with a name that start with _ will be added to HomeKit as a momentary switch
+ Switch name will be same as scene name but without the _.
+ Momentary switch means that it will turn off itself after a while.

</details>

<details>
<summary><b>Global variables</b></summary>

+ Switch global variables - It is possible to create Switch in HomeKit with a toggle behaviour:
  + creating global variables (one for each switch) with 2 possible values: "true" and "false"
  + configuring a new parameter ("switchglobalvariables") in config.json that contains a comma separated list of the variable names you defined.
+ Dimmer global variables - It is possible to create Dimmer in HomeKit with a toggle behaviour:
  + creating global variables (one for each dimmer) with possible values from 0 to 100  
  + configuring a new parameter ("dimmerglobalvariables") in config.json that contains a comma separated list of the variable names you defined.
+ You can use these variable to trigger Home Center scenes.
+ Note: you need to configure homebridge in config.json with a user with superuser privileges because normal users cannot set global variable from the outside of Home Center.

</details>

<details>
<summary><b>Security System</b></summary>

See: [security system](https://github.com/ilcato/homebridge-Fibaro-home-center/blob/main/docs/security-system.md)

</details>

<details>
<summary><b>Climate / Heating zones</b></summary>
    
+ Thermostat Controls: once a climate / heating zone is created in the Home Center / Yubii Home, a corresponding Thermostat accessory is generated in HomeKit. The Thermostat accessory provides intuitive controls within the HomeKit ecosystem.
+ Manual Settings and Timeout: the controls available on the Thermostat activate a manual setting for the specified duration. This duration is set by the `thermostattimeout` parameter in the `config.json` file. During this period, the manual settings remain in effect for the zone. After the predefined timeout period expires, the normal schedule of the zone is automatically reactivated. This ensures that the zone reverts to its programmed schedule once the manual setting duration elapses.

</details>

<details>
<summary><b>Child bridge mode</b></summary>
You can run this plugin as child bridge, that is an isolated process. There are several reasons/benefits of doing this. Details: https://github.com/homebridge/homebridge/wiki/Child-Bridges.
</details>


# Troubleshooting

<details>
<summary><b>The device is displayed incorrectly or doesn't display at all</b></summary>
    
+ For some devices, responsible for the display method is field Role (for a given device in the Fibaro Panel). Check [Advanced Control](https://github.com/ilcato/homebridge-Fibaro-home-center/blob/main/docs/advcontrol.md).
+ If device still displays incorrectly (e.g. as Switch but should be Outlet) or doubled (one device is displayed as two), you must remove this device from cache (in Homebridge Settings). Unfortunately, in this case, the settings for this device will most likely be lost (room selection, automations, etc.).
+ Every change of devices display type (e.g. from Switch to Outlet etc.) can make it display incorrectly (like doubled). It is recommended to turn off Apple hubs during changes.
+ If you want new device to be supported (or if it displays incorrectly despite the recommendation above) open new Issue and write: what is this product, as what should it be displayed, whether it does not display at all or displays incorrectly (as what device?), what version of this plugin, what Home Center, and attach the API response for this product (see below).

</details>

<details>
<summary><b>Get API response for device</b></summary>

Open in browser: http://FIBARO-IP/api/devices/DEVICE-ID (replace FIBARO-IP with your Home Center IP and DEVICE-ID with device ID) and login.

</details>

<details>
<summary><b>More logs</b></summary>

If you have any issues with this plugin, enable all logs in plugin config and the debug mode in the homebridge settings and restart the homebridge / child bridge. This will show additional information in log.

</details>

# Contributing and support

- Feel free to create [Issue](https://github.com/ilcato/homebridge-fibaro-home-center/issues) or [Pull Request](https://github.com/ilcato/homebridge-fibaro-home-center/pulls)

# Disclaimer

- This is not the official Fibaro plugin. The plugin uses the official API. Despite the efforts made, the operation of the plugin is without any guarantees and at your own risk.

# Latest release notes

### Version 1.7.4
+ Small refactoring
+ Bump dependencies

### Version 1.7.3
+ Small refactoring
+ Bump dependencies


#### See all: [Releases](https://github.com/ilcato/homebridge-fibaro-home-center/releases)
