# Home app behaviour

Rendering behaviour of Apple's Home app, none of it documented by Apple, found by
testing on real accessories. Recorded because several of these took a deploy,
a cache removal and a restart each to establish — and because the negative
results are invisible in the code.

Verified on iOS 26 with an accessory exposing a Thermostat, a Fanv2 and up to
three Switch services.

## Service labels

In an accessory's detail view, the labels next to the extra controls come from
`ConfiguredName`. Without it every control shows the accessory's name, even when
the service has a distinct `Name`.

A single extra service is rendered without a label at all — labels only appear
once there are two or more.

`ConfiguredName` is writable, so it should be seeded only when empty; otherwise a
rename done in the Home app is overwritten on every restart.

## Where a control shows up

A characteristic on the main service and a separate service are rendered at
different depths. `RotationSpeed` added to the thermostat ends up behind the
settings gear, while the same characteristic on its own `Fanv2` service appears
directly in the detail view. Moving a control onto its own service is the only
way to surface it.

## Rotation speed steps

`minStep` must divide `maxValue`. With `minStep: 33.34` and a maximum of 100 the
grid runs 0 / 33.34 / 66.68 / 100.02, the last position exceeds the maximum, and
the top speed is silently clamped to the one below it. `33.33` works.

## Multiple writes per interaction

One user interaction can produce several writes. Picking a mode while the
accessory is off writes `Active` and the target state back to back; raising the
fan from zero writes `Active` and `RotationSpeed`. Devices behind a serial bridge
mishandle the resulting overlapping commands, which is why the plugin defers the
power-on command and debounces fan speed.

HomeKit also sends a write when the value is unchanged, so selecting a mode the
accessory already reports still reaches the device. That is what makes it
possible to leave a mode the plugin can only approximate.

## What cannot be influenced

- An accessory with several services is summarised on its tile as "N on, M off"
  rather than by its main service. Neither `setPrimaryService`,
  `addLinkedService` nor the accessory category changes that. `setPrimaryService`
  additionally stopped the service labels from being rendered.
- Adding `TargetFanState` to a `Fanv2` service produced no auto/manual control,
  with or without `CurrentFanState` alongside it.
- With `HeaterCooler`, AUTO renders as a two-handle band dial and needs a
  `HeatingThresholdTemperature` or the dial comes up empty. Making that
  characteristic read-only does not stop the Home app from letting the handle be
  dragged — it simply snaps back.
- Reporting the real operating state through `CurrentHeatingCoolingState` means
  the Home app treats the tile as off while a device idles, so tapping the tile no
  longer toggles power.

## Telling a plugin problem from a rendering one

When something doesn't appear in the Home app, check what the accessory actually
publishes before changing code. The Homebridge UI shows an accessory's services
and characteristic values, including properties such as step and range, and it
reads them from the running HAP server rather than from iOS. A third-party
HomeKit client works too.

If the values there are right and the Home app still disagrees, it is a
rendering or caching issue, not a plugin bug. Several findings above were
initially misdiagnosed the other way around.

## Caching

iOS caches characteristic properties and service labels. A changed step, range or
label may not appear until the accessory is removed from the Homebridge cache
(Homebridge UI → Remove Single Cached Accessory) and recreated. Verify against
the Homebridge UI or a third-party app first to tell a plugin bug from a stale
cache.

## Why the hvac accessories look the way they do

Apple's `HeaterCooler` service looks like the obvious fit for an air
conditioner, and it was tried first. It was abandoned for three reasons, all of
them documented above: its AUTO state needs a heating threshold that cannot be
made read-only in a way the Home app respects; its `RotationSpeed` ends up behind
the settings gear rather than in the detail view; and splitting power (`Active`)
from mode into two characteristics is what makes iOS send two writes for one
interaction, which serial-bridged devices mishandle.

A `Thermostat` avoids all three: power is a mode, so there is one write, and the
temperature dial is the main control. Fan speed then moves to its own `Fanv2`
service to be reachable, and the modes HomeKit has no vocabulary for become
switches. Tapping the tile to toggle power works with either service, so nothing
was lost there.

The cost is a grouped tile summarised as "N on, M off", which nothing in HAP
appears to change.
