# Fibaro Security System configuration for HomeKit

+ In config.json:
  + add the parameter: `"securitysystem": "enabled"`

+ In Fibaro Home Center:
  + Create an Enumerated variable named `SecuritySystem` with the following values: . StayArmed . AwayArmed . NightArmed . Disarmed . AlarmTriggered
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

+ Scene must have flag `Do not stop scene when alarm breached` checked.
