# GetPins(props)
_Optional_ Add audio or serial pins to the plugin object. Controls may have pins not defined here. Values defined by properties of the plugin can be accessed inside this function via a table that is passed to this function as an argument. Pins are defined by an object containing the following properties:
Name | Type | Required? | Description
-----|------|-----------|------------
Name | String | Yes | 
Name of the pin.
Direction | String | Yes | Defines the direction of pins shown.<BR>Options are :<BR>"input"<BR>"output"
Domain | String | No | Defines the type of pin. Pins are audio by default. Set to "serial" for a serial pin.

_Note: This function can only be used to add audio or serial pins._

```lua
function GetPins(props) 
  local pins = {}
  table.insert(pins,{
    Name = "Audio Input",
    Direction = "input"
  })
  table.insert(pins,{
    Name = "Audio Output",
    Direction = "output"
  })
  return pins
end
```
