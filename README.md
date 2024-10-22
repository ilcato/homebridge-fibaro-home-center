<img src="https://raw.githubusercontent.com/homebridge/verified/latest/icons/homebridge-fibaro-home-center.png" width="100px"></img>
# homebridge-fibaro-home-center

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![Downloads](https://img.shields.io/npm/dt/homebridge-fibaro-home-center)](https://www.npmjs.com/package/homebridge-fibaro-home-center)
[![Homebridge Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/38Dpux)

[![GitHub version](https://img.shields.io/github/package-json/v/ilcato/homebridge-fibaro-home-center?label=GitHub)](https://github.com/ilcato/homebridge-fibaro-home-center/releases/)
[![npm version](https://img.shields.io/npm/v/homebridge-fibaro-home-center?color=%23cb3837&label=npm)](https://www.npmjs.com/package/homebridge-fibaro-home-center)

[![Buy me a cofee](https://cdn.buymeacoffee.com/buttons/default-orange.png)](https://www.buymeacoffee.com/ilcato)

### Homebridge plugin for Fibaro Home Center (2, 2 Lite, 3, 3 Lite, Yubii Home).

This is an [Homebridge](https://homebridge.io) plugin.

It supports devices (Z-Wave only, Zigbee not supported), scenes, global variables, security systems, climate / heating zones. Exposes them to Homebridge and HomeKit (Apple Home and more).

# How it works

This plugin comunicates with Fibaro HC / Yubii Home by the official Fibaro API. Homebridge and HC / Yubii Home should be in the same local network with the same IP address range (same subnet), E.G. 192.168.1.XXX. 

You must have an account in HC / Yubii Home. The main account has access to all devices, scenes, etc., for additional accounts you can select what to share.

Results will appear in Homebridge and via HomeKit in your Apple Home app (or other HomeKit app).

# Installation

This plugin can be easily installed through:
- Homebridge UI
- via [NPM](https://www.npmjs.com/package/homebridge-fibaro-home-center) "globally" by typing:

    `npm install -g homebridge-fibaro-home-center`
    
# Configuration
Configure the plugin through the settings UI or directly in the JSON editor.

<details>
<summary><b>config.json example</b></summary>

```json

{
  "platforms": [
    {
      "platform": "FibaroHC",
      "name": "FibaroHC",
      "url": "192.168.1.100",
      "username": "mail@domain.com",
      "password": "your-password",
      "pollerperiod": 3,
      "markDeadDevices": true,
      "thermostattimeout": 7200
      "thermostatmaxtemperature": 100,
      "switchglobalvariables": "name1,name2,name3"
      "dimmerglobalvariables": "name1,name2,name3",
      "adminUsername": "admin_name",
      "adminPassword": "admin_password",
      "securitysystem": "enabled",
      "addRoomNameToDeviceName" : "disabled",
      "doorbellDeviceId" : 21,
      "logsLevel": 1,
      "devices": [
        {
          "id": 42,
          "displayAs": "switch",
        },
        {
          "id": 58,
          "displayAs": "exclude",
        }
      ]
    }
  ]
}
```
#### Basic fields (required)
+ `url` (string) : url or IP of your Home Center / Yubii Home. Using https may be mandatory if you configured HC to use it. Examples:
  + `192.168.1.100` - replace with your IP,
  + `https://hc-00000XXX.local` - replace with your HC serial, get ca.cer file from HC and put it in Homebridge in same folder as config.json,
  + `http://hc-00000XXX.local` - replace with your HC serial.
+ `username` (string) : username of your Home Center / Yubii Home.
+ `password` (string) : password of your Home Center / Yubii Home.
+ `platform` (string) : platform name, must be 'FibaroHC'.
+ `name` (string) : name of the plugin displayed in Homebridge log and as plugin bridge name, default 'FibaroHC'.

#### Advanced
+ `pollerperiod` (integer) : Polling interval (refresh interval) for querying Fibaro Home Center (0: disabled, recomended: 3, 1 or 2 seconds allows for a more responsive update of the Home app when changes appear outside the HomeKit environment). If it is disabled the Home app is not updated automatically when such a change happen but only when you close a panel and reopen it. Enabling this option is useful to read the new state when controlling devices outside HomeKit, E.G.: via Fibaro, physical buttons, scenes and automations.
+ `markDeadDevices` (boolean) : Show dead devices as not responding in HomeKit. Dead devices are devices that have connection problems and in the Fibaro hub selected option to mark such devices. Warning: Not responding device in HomeKit can break automation, it is recommended to place such device in a separate automation.
+ `thermostatmaxtemperature` (integer) : Set max temperature for thermostatic devices (default 100 C).
+ `thermostattimeout` (integer) : Number of seconds for the thermostat timeout, default: 7200 (2 hours).
+ `switchglobalvariables` (string) : Comma separated list of home center global variables names acting like a bistable switch.
+ `dimmerglobalvariables` (string) : Comma separated list of home center global variables names acting like a dimmer.
+ `adminUsername` (string) : Admin username of your home center, needed only to set global variables.
+ `adminPassword` (string) : Admin password of your home center, needed only to set global variables.
+ `securitysystem` (string) : Set 'enabled' or 'disabled' in order to manage the availability of the security system.
+ `addRoomNameToDeviceName` (string) : Set 'enabled', 'enabledBefore' or 'disabled'. If enabled, to each device name will be added the name of the room in which it is located. Warning: changing this may cause that some of your devices will be removed and add as new.
+ `doorbellDeviceId` (integer) : Home Center binary sensor device id acting as a doorbell.
+ `logsLevel` (integer) : Desired log level: 0 disabled, 1 only changes, 2 all.

#### Individual for each device
+ `id` : Device ID (like: 42).
+ `displayAS` : Display as: switch, dimmer, etc. or exclude device.

</details>


# Manuals

<details>
<summary><b>Exclude devices</b></summary>

Exclude one or more devices:
+ add id of this device in plugin settings and select display as: 'exclude'
+ or in Fibaro panel use a specific user (not an admin one) and grant access to only the needed devices
+ or in Fibaro panel rename the device you want to exclude with an initial _ character.

Warning: If you exclude the device, adding it again may require reconfiguration (assignment to a room, automations, etc.).

</details>

<details>
<summary><b>Scenes</b></summary>

+ Any scene with a name that start with _ (in Fibaro panel) will be added to HomeKit as a momentary switch
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

+ Enable security system in plugin settings or in config.json add the parameter: `"securitysystem": "enabled"`

+ In Fibaro Home Center:
  + Create an Enumerated variable named `SecuritySystem` with the following values:
    + `StayArmed`
    + `AwayArmed`
    + `NightArmed`
    + `Disarmed`
    + `AlarmTriggered`
  + Create the following Alarm Zones in the Alarm Zones panel in the settings section (order is important): . StayZone . AwayZone . NightZone
  + For each security zone select the appropriate sensors.
  + Create a `SetAlarmTriggered` scene in the Alarm Scenes panel in the settings section that set the SecuritySystem variable to `AlarmTriggered`. The scene can also contain action logic to manage the alarm, eg: activate a siren.
  + Create a scene for setting arming status of devices and update the previous global variable. Scene names and code MUST be:

    + SetStayArmed:
      ```
        fibaro.alarm("disarm")
        fibaro.alarm(1, "arm")
        fibaro.setGlobalVariable("SecuritySystem", "StayArmed")
      ```
     + SetAwayArmed
       ```
         fibaro.alarm("disarm")
         fibaro.alarm(2, "arm")
         fibaro.setGlobalVariable("SecuritySystem", "AwayArmed")
       ```
     + SetNightArmed
       ```
         fibaro.alarm("disarm")
         fibaro.alarm(3, "arm")
         fibaro.setGlobalVariable("SecuritySystem", "NightArmed")
       ```
     + SetDisarmed
       ```
         fibaro.alarm("disarm")
         fibaro.setGlobalVariable("SecuritySystem", "Disarmed")
       ```

  + Scene must have flag `Do not stop scene when alarm breached` checked, in recent versions it's `Allow to run when alarm breached`.

</details>

<details>
<summary><b>Climate / Heating zones</b></summary>
    
+ Thermostat Controls: once a climate / heating zone is created in the Home Center / Yubii Home, a corresponding Thermostat accessory is generated in HomeKit. The Thermostat accessory provides intuitive controls within the HomeKit ecosystem.
+ Manual Settings and Timeout: the controls available on the Thermostat activate a manual setting for the specified duration. This duration is set by the `thermostattimeout` parameter in the `config.json` file. During this period, the manual settings remain in effect for the zone. After the predefined timeout period expires, the normal schedule of the zone is automatically reactivated. This ensures that the zone reverts to its programmed schedule once the manual setting duration elapses.

</details>

<details>
<summary><b>Child bridge mode</b></summary>

It is recomended to run this plugin as child bridge, there are several reasons and benefits of doing this:
+ greater security because it is a separate, isolated process,
+ every instance / bridge can expose maximum 150 accessories due to a HomeKit limit, so if you have other plugins and don't use child bridge, you share this limit with them. 

Details: https://github.com/homebridge/homebridge/wiki/Child-Bridges.

</details>


# Troubleshooting

<details>
<summary><b>The device is displayed incorrectly or doesn't display at all</b></summary>
    

+ If device displays incorrectly (e.g. as Switch but should be Outlet) or doubled (one device is displayed as two), you must remove this device from cache (in Homebridge Settings). Unfortunately, in this case, the settings for this device will most likely be lost (room selection, automations, etc.).
+ Every change of devices display type (e.g. from Switch to Outlet etc.) can make it display incorrectly (like doubled). It is recommended to turn off Apple hubs during changes.

</details>

<details>
<summary><b>Get API response for device</b></summary>

- Open in browser: http://FIBARO-IP/api/devices/DEVICE-ID (replace FIBARO-IP with your Home Center IP and DEVICE-ID with device ID) and login.
- Device ID you can check in Fibaro panel or directly in HomeKit device information (serial number field).
- Most important values are: type, baseType, deviceControlType and deviceRole.

API response example:

```json
{
  "id": 114,
  "name": "Bedroom",
  "roomID": 226,
  "view": [
      {
          "assetsPath": "dynamic-plugins/com.fibaro.binarySwitch",
          "name": "com.fibaro.binarySwitch",
          "translatesPath": "/assets/i18n/com.fibaro.binarySwitch",
          "type": "ts"
      }
  ],
  "type": "com.fibaro.binarySwitch",
  "baseType": "com.fibaro.actor",
  "enabled": true,
  "visible": true,
  "isPlugin": false,
  "parentId": 110,
  "viewXml": false,
  "hasUIView": true,
  "configXml": false,
  "interfaces": [
      "zwave",
      "zwaveMultiChannelAssociation",
      "zwaveProtection"
  ],
  "properties": {
      "parameters": [
          {
              "id": 1,
              "lastReportedValue": 1,
              "lastSetValue": 1,
              "size": 1,
              "value": 1
          },
          {
              "id": 20,
              "lastReportedValue": 0,
              "lastSetValue": 0,
              "size": 1,
              "value": 0
          }
      ],
      "pollingTimeSec": 0,
      "zwaveCompany": "Fibargroup",
      "zwaveInfo": "3,6,4",
      "zwaveVersion": "5.0",
      "RFProtectionState": 0,
      "RFProtectionSupport": 3,
      "categories": [
          "other"
      ],
      "configured": true,
      "dead": false,
      "deadReason": "",
      "deviceControlType": 1,
      "deviceIcon": 2,
      "deviceRole": "Other",
      "endPointId": 2,
      "icon": {
          "path": "/assets/icon/fibaro/onoff/onoff0.png",
          "source": "HC"
      },
      "localProtectionState": 0,
      "localProtectionSupport": 5,
      "log": "",
      "logTemp": "",
      "manufacturer": "",
      "markAsDead": true,
      "model": "",
      "nodeId": 18,
      "parametersTemplate": "874",
      "productInfo": "1,15,2,4,16,0,5,0",
      "protectionExclusiveControl": 0,
      "protectionExclusiveControlSupport": false,
      "protectionState": 0,
      "protectionTimeout": 0,
      "protectionTimeoutSupport": false,
      "saveLogs": true,
      "serialNumber": "h'0000000000001f16",
      "state": false,
      "supportedDeviceRoles": [
          "Light",
          "Drencher",
          "Pin",
          "NightLamp",
          "Kettle",
          "Bracket",
          "AirConditioner",
          "AlarmAlarm",
          "Coffee",
          "GardenLamp",
          "TvSet",
          "CeilingFan",
          "Toaster",
          "Radio",
          "RoofWindow",
          "Other",
          "AlarmState",
          "AlarmArm",
          "VideoGateBell",
          "VideoGateOpen",
          "Valve"
      ],
      "useTemplate": true,
      "userDescription": "",
      "value": false
  },
  "actions": {
      "reconfigure": 0,
      "toggle": 0,
      "turnOff": 0,
      "turnOn": 0
  },
  "created": 1650223230,
  "modified": 1717098148,
  "sortOrder": 93
}

```

</details>

<details>
<summary><b>More logs</b></summary>

If you have any issues with this plugin, enable all logs in plugin config and the debug mode in the Homebridge settings and restart the Homebridge / child bridge. This will show additional information in log.

</details>

<details>
<summary><b>Fibaro HC2 Lite issues</b></summary>

- Update firmware to the newest version, at least 4.630
- Remove from the box (it overheats).
- Replace the battery.
- Disable remote access. The API works locally, so it will not affect the operation of the plugin, but the Fibaro application will not work when you are offline.
- If any of the above does not help, it may be necessary to call support or visit the service and replace some parts.

</details>

# Contributing and support

Feel free to create [Issue](https://github.com/ilcato/homebridge-fibaro-home-center/issues) or [Pull Request](https://github.com/ilcato/homebridge-fibaro-home-center/pulls)

# Disclaimer

- This is not the official Fibaro plugin but it uses the official Fibaro API. 
- Despite the efforts made, the operation of the plugin is without any guarantees.
- All actions are at your own risk.
- All product and company names are trademarks™ or registered® trademarks of their respective holders. Use of them does not imply any affiliation with or endorsement by them.

# Latest release notes

### Version 3.2.0
- Added support for radiator thermostatic valves ("com.fibaro.thermostatDanfoss", "com.fibaro.FGT001").
- Fix issue #520
- Dependencies updates.

### Version 3.1.1
- Fixed issues #507, #508, #509, #510
- Dependencies updates.

#### See all: [Releases](https://github.com/ilcato/homebridge-fibaro-home-center/releases)
