# GetProperties()
Add properties to the plugin. These are user-configurable fields defined before running or emulating a design. Properties are defined in a table where each property is defined as an object with the following parameters.
Property | Type | Required? | Description
---------|------|-----------|------------
Name | String | Yes | The property name displayed in the properties pane of Q-SYS Designer Software (QDS).
Type | String | Yes | Sets the type of property. Options:<BR>"string"<BR>"integer"<BR>"double"<BR>"boolean"<BR>"enum"<BR>See Type Properties for more information.
Value | Varies | Yes | Default value for the property. Type is dependent on property type - e.g. If Type = 'string' then Value = "A String".
Choices | Table | No | List of choice strings that will be displayed in a combo box. Only valid for 'enum' property type - e.g. {"Choice 1", "Choice 2"}.
Min | Integer | No | Defines lowest extent for a property. Valid for the 'integer' and 'double' property types.
Max | Integer | No | Defines the highest extent for a property. Valid for the 'integer' and 'double' property types.
Header | String | No | Define a Header this property will display below. Requires QDS 9.10 or later
Comment | String | No | Define a comment to show below this property. Requires QDS 9.10 or later
Description | String | No | Give a brief description of this property.

## Type Properties

Type | Description
string | A string. A default value is optional.
integer | A signed-long floating number. A default value is required.
double | A double floating point value. A default value is required.
boolean | A combo box with the Choices of 'Yes' or 'No'. In Runtime, the Value will return a true or false.
enum | A combo box of strings defined by Choices. A default value is not required (combo box will show blank until a selection is made).

```lua
function GetProperties()
  local properties = {}
  table.insert(properties,{
    Name = "String Property", 
    Type = "string", 
    Value = "This is a string"
  })
  table.insert(properties,{
    Name = "Integer Property",
    Type = "integer",
    Min = 0,
    Max = 100,
    Value = 50
  })
  table.insert(properties,{
    Name = "Double Property", 
    Type = "double", 
    Min = 0, 
    Max = 100, 
    Value = 50
  })
  table.insert(properties,{
    Name = "Enum Property",
    Type = "enum",
    Choices = {"Choice1", "Choice2", "Choice3"},
    Value = "Choice 1"
  })
  table.insert(properties,{
    Name = "Bool Property", 
    Type = "boolean", 
    Value = true
  })
  return properties
end
```

# RectifyProperties(props)
_Optional_ This function runs after a property change as a mechanism to adapt global variables and change visibility of properties when appropriate. Values defined by properties of the plugin can be accessed inside this function via a table that is passed to this function as an argument.

Name | Type | Required? | Description
IsHidden | Boolean | No | Defines the visibility of a property in the properties pane of QDS.

```lua
function RectifyProperties(props)
  props["Number of PINs"].IsHidden = props["Use PIN"].Value == "No"
  return props
end
```
