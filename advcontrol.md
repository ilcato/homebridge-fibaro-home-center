# Advanced control

Now you can enable new option in plugin settings if you want the device type in Homekit to depend on how the device role in Fibaro is selected. For devices like Switch, Double Switch, Smart Implant, Wall Plug etc. you can change how it will display in Homekit - in the Fibaro panel go to this device and check field Role (or What controls the device).
+ Selecting Light should set device as Light,
+ selecting "Other" / "Another device" should set the device as Switch,
+ selecting Sprinkler or Valve should set device as Valve,
+ and any other case will be Outlet.

## WARNING
Every change of devices display type (e.g. from Switch to Outlet etc.) can make it display incorrectly (like doubled). It is recommended to turn off Apple hubs during changes. If device displays incorrectly (e.g. as Switch but should be Outlet) or doubled (one device is displayed as two), you must remove this device from cache (in Homebridge Settings). Unfortunately, in this case, the settings for this device will most likely be lost (room selection, automations, etc.).

## Look what it changed

<img width="842" alt="" src="https://github.com/mkz212/homebridge-fibaro-home-center/assets/82271669/657ec969-bb12-489c-8038-a2ad4849c6cc">
