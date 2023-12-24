# Advanced control

Now you can enable new option in plugin settings if you want the device type in Homekit to depend on how the device role in Fibaro is selected. For devices like Switch, Double Switch, Smart Implant, Wall Plug etc. you can change how it will display in Homekit - in the Fibaro panel go to this device and check field Role (or What controls the device).
+ Selecting Light should set device as Light,
+ selecting "Other" / "Another device" should set the device as Switch,
+ selecting Sprinkler or Valve should set device as Valve,
+ and any other case will be Outlet.

### Important
Every change of devices display type (e.g. from Switch to Outlet etc.) can make it display incorrectly (like doubled). It is recommended to turn off Apple hubs during changes. If device displays incorrectly (e.g. as Switch but should be Outlet) or doubled (one device is displayed as two), you must remove this device from cache (in Homebridge Settings). Unfortunately, in this case, the settings for this device will most likely be lost (room selection, automations, etc.).

### What it changed

| Product group  | Role (in Fibaro panel) | Displayed in HomeKit (Advanced Control Disabled) | Displayed in HomeKit (Advanced Control Enabled) | Changed (Yes / No) |
| ------------------------ | --------------------- | ------------------------ | ------------------------ | ------------------------ |
| Binary                   | Light                 | Light                    | Light                    | no                       |
| Binary                   | Other (on HC2)        | Outlet                   | Switch                   | yes                      |
| Binary                   | Other (on HC3)        | Switch                   | Switch                   | no                       |
| Binary                   | Sprinkler             | Switch                   | Valve                    | yes                      |
| Binary                   | Valve                 | Valve                    | Valve                    | no                       |
| Binary                   | Default               | Switch                   | Outlet                   | yes                      |
| Wall Plug                | Light                 | Outlet                   | Light                    | yes                      |
| Wall Plug                | Other (on HC2)        | Outlet                   | Switch                   | yes                      |
| Wall Plug                | Other (on HC3)        | Outlet                   | Switch                   | yes                      |
| Wall Plug                | Sprinkler             | Outlet                   | Valve                    | yes                      |
| Wall Plug                | Valve                 | Outlet                   | Valve                    | yes                      |
| Wall Plug                | Default               | Outlet                   | Outlet                   | no                       |
