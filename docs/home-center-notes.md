# Home Center behaviour

Behaviour of the Home Center that isn't in the API documentation, found while
building the hvac support against a real HC3. Kept here because the plugin's
design in several places only makes sense once you know it.

## Change events

`refreshStates` coalesces properties updated in quick succession into a single
change. A QuickApp that sets mode, setpoint and fan mode one after another
produces one change carrying all three, so dispatch has to handle each property
independently — an either/or chain would apply only the first.

Numeric properties arrive as strings in a change (`"18.00"`), not as numbers.

## Actions

Booleans in action arguments sent over REST are coerced to `0` / `1`. The same
action invoked from the Home Center's own UI keeps them as booleans, so a
QuickApp handler should accept both forms.

`setThermostatFanMode` takes a second argument, the fan-off flag, which only
applies to devices reporting `supportsThermostatFanOff`. The plugin sends the
speed alone rather than passing `false`, which the REST layer would coerce to `0`
anyway.

## Thermostat vocabulary

Thermostat mode and fan mode values are the Z-Wave command class names in
PascalCase: `Off`, `Cool`, `Heat`, `Auto`, `Dry`, `Fan`, `FullPower` for modes;
`Low`, `Medium`, `High`, `AutoLow`, `AutoMedium`, `AutoHigh` for fan modes.

The API accepts arbitrary strings, but the Home Center UI silently ignores values
it doesn't recognise — a device reporting localised mode names renders no mode
buttons at all. Recognised values are translated for display, so `FullPower`
shows up as "Max".

## Capability reporting

Devices report what they support: `supportedThermostatModes`,
`supportedThermostatFanModes`, and `heating`/`coolingThermostatSetpointCapabilities`
`Min`/`Max`/`Step`. Deriving services and characteristic properties from those
reports keeps the plugin working on devices that expose less, which is why the
hvac support creates a fan service and mode switches only for what a device
actually lists.

Fan-only off exists in the model as a capability/state pair
(`supportsThermostatFanOff`, `thermostatFanOff`), and the state does appear in
`refreshStates`. It isn't wired up: `Active` would have to be the OR of two
properties that arrive in separate changes, which one subscription per
characteristic cannot express directly.

## Checking things against a Home Center

Most of the above was established with these four calls. Substitute the host and
a Basic auth token.

Read a device's full state, including which interfaces and actions it carries:

    curl -sk "http://<hc3>/api/devices/49" -H 'Authorization: Basic <token>' | jq

List the device type hierarchy, useful for finding which type a child device
should use:

    curl -sk "http://<hc3>/api/devices/hierarchy" -H 'Authorization: Basic <token>' | jq

Watch change events the way the plugin's poller sees them. Take a cursor first,
then perform the action, then read everything since that cursor:

    LAST=$(curl -sk "http://<hc3>/api/refreshStates?last=0" -H 'Authorization: Basic <token>' | jq '.last')
    # perform the action in the Home Center UI or the Home app
    curl -sk "http://<hc3>/api/refreshStates?last=$LAST" -H 'Authorization: Basic <token>' \
      | jq '.changes[] | select(.id==49)'

This is how coalescing was found: a single change object carrying `thermostatMode`
and `coolingThermostatSetpoint` together.

Invoke a device action directly, which is what the plugin does and a good way to
tell a plugin problem from a device one:

    curl -sk -X POST "http://<hc3>/api/devices/49/action/setThermostatFanMode" \
      -H 'Content-Type: application/json' -H 'Authorization: Basic <token>' \
      -d '{"args":["Medium"]}'
