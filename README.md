<img src="https://raw.githubusercontent.com/homebridge/verified/latest/icons/homebridge-fibaro-home-center.png" width="100px"></img>
# homebridge-fibaro-home-center

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![Downloads](https://img.shields.io/npm/dt/homebridge-fibaro-home-center)](https://www.npmjs.com/package/homebridge-fibaro-home-center)
[![Homebridge Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/38Dpux)

[![GitHub version](https://img.shields.io/github/package-json/v/ilcato/homebridge-fibaro-home-center?label=GitHub)](https://github.com/ilcato/homebridge-fibaro-home-center/releases/)
[![npm version](https://img.shields.io/npm/v/homebridge-fibaro-home-center?color=%23cb3837&label=npm)](https://www.npmjs.com/package/homebridge-fibaro-home-center)

[![Buy me a cofee](https://cdn.buymeacoffee.com/buttons/default-orange.png)](https://www.buymeacoffee.com/ilcato)

### Homebridge plugin for Fibaro Home Center (2, 2 Lite, 3, 3 Lite, Yubii Home).

Supports devices, scenes, global variables, security systems, heating / comfort zones.

# How it works

This plugin comunicates with Fibaro HC / Yubii Home located on the same network, by the official Fibaro API.

You must have an account in HC / Yubii Home. The main account has access to all devices, scenes, etc., for additional accounts you can select what to share.

# Installation

This plugin can be easily installed and configured through Homebridge UI or via [NPM](https://www.npmjs.com/package/homebridge-fibaro-home-center) "globally" by typing:

    npm install -g homebridge-fibaro-home-center
    
# Configuration
Configure the plugin through the settings UI or directly in the JSON editor.

#### Required:
+ `url` : url or IP of your Home Center / Yubii Home, examples:
  + `192.168.1.100`
  + `https://hc-00000XXX.local` (put ca.cer file in the same folder as config.json)
  + `http://hc-00000XXX.local`
+ `username` : username of your Home Center / Yubii Home
+ `password` : password of your Home Center / Yubii Home

#### Optional:
+ `pollerperiod` : Polling interval for querying Fibaro Home Center machine (0: disabled, recomended: 2, 1 second allows for a more responsive update of the Home app when changes appear outside the HomeKit environment). If it is disabled the Home app is not updated automatically when such a change happen but only when you close a panel and reopen it.
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


# Troubleshooting and manuals

<details>
<summary><b>The device is displayed incorrectly or doesn't display at all</b></summary>
    
+ For some devices, responsible for the display method is field Role (for a given device in the Fibaro Panel). Check [Advanced Control](https://github.com/ilcato/homebridge-Fibaro-home-center/blob/main/docs/advcontrol.md).
+ If device still displays incorrectly (e.g. as Switch but should be Outlet) or doubled (one device is displayed as two), you must remove this device from cache (in Homebridge Settings). Unfortunately, in this case, the settings for this device will most likely be lost (room selection, automations, etc.).
+ Every change of devices display type (e.g. from Switch to Outlet etc.) can make it display incorrectly (like doubled). It is recommended to turn off Apple hubs during changes.
+ If you want new device to be supported (or if it displays incorrectly despite the recommendation above) open new Issue and write: what is this product, as what should it be displayed, whether it does not display at all or displays incorrectly (as what device?), what version of this plugin, what Home Center, and attach the API response for this product (see below).

</details>

<details>
<summary><b>Advanced Control</b></summary>

+ Now you can enable new option in plugin settings if you want the device type in Homekit to depend on how the device role in Fibaro is selected. See details: [advanced control](https://github.com/ilcato/homebridge-Fibaro-home-center/blob/main/docs/advcontrol.md)

</details>

<details>
<summary><b>Get API response for device</b></summary>

+ How to get API response for device. Open in browser: http://FIBARO-IP/api/devices/ID (replace FIBARO-IP with your Home Center IP and ID with device ID) and login.

</details>

<details>
<summary><b>Exclude devices</b></summary>

+ If You want to exclude one or more devices: use a specific user (not an admin one) and grant access to only the needed devices or rename the device you want to exclude with an initial _ character.
+ Warning: If you exclude the device, adding it again will require reconfiguration (assignment to a room, automations, etc.).

</details>

<details>
<summary><b>Adding scenes as momentary switches</b></summary>

+ Any scenes with a name that start with _ will be added to HomeKit as a momentary switch with the same name without the _.

</details>

<details>
<summary><b>Switch accessories mapped on Home Center global variables</b></summary>

+ It is possible to create Switch accessories on HomeKit with a toggle behaviour by:
  + creating global variables (one for each switch) with 2 possible values: "true" and "false"
  + configuring a new parameter ("switchglobalvariables") in config.json that contains a comma separated list of the variable names you defined.
+ You can use these variable to trigger Home Center scenes.
+ Known issue: you need to configure homebridge in config.json with a user with superuser privileges because normal users cannot set global variable from the outside of Home Center.

</details>

<details>
<summary><b>Fibaro Security System configuration for HomeKit</b></summary>

See: [security system](https://github.com/ilcato/homebridge-Fibaro-home-center/blob/main/docs/security-system.md)

</details>

<details>
<summary><b>Child bridge mode</b></summary>
You can run this plugin as child bridge, that is an isolated process. There are several reasons/benefits of doing this. Details: https://github.com/homebridge/homebridge/wiki/Child-Bridges.
</details>

<details>
<summary><b>More logs</b></summary>
If you have any issues with this plugin, enable all logs in plugin config and the debug mode in the homebridge settings and restart the homebridge / child bridge. This will print additional information to the log.
</details>

# Contributing and support

- Feel free to create [Issue](https://github.com/ilcato/homebridge-fibaro-home-center/issues) or [Pull Request](https://github.com/ilcato/homebridge-fibaro-home-center/pulls)

# Latest release notes

### Version 1.5.2
+ Added the ability to have devices with the same name in the same room (in Fibaro configuration). This applies to newly added devices or devices with updated name or room. For existing devices, changing the name of the device or assigning it to another room will give a new uuid and thus it may break the automation in HomeKit (as before), but it will also cause the transition to a new internal mechanism that will not suffer for such a problems in the future. The update itself will not change anything - it will not break devices or automations.
+ One address field - the URL field now supports both: URL and IP. Field "host" is deprecated and will be removed in the future.

### Version 1.5.1
+ Fix bug causing endless rastarting Homebridge when unable to connect to Home Center / Yubii Home
+ Adding a delay (1 minute) in the next attempt to read data (in case of failure)
+ Adding a delay (5 minutes) in the next attempt to first login (in case of failure)
+ Fix bug in the dimmers
+ Added the ability to select in the config thermostat max temperature

#### See all: [Releases](https://github.com/ilcato/homebridge-fibaro-home-center/releases)
