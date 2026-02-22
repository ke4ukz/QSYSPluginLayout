// ── Q-SYS ControlType enum values ──
export const CONTROL_TYPES = ['Button', 'Knob', 'Indicator', 'Text'];

// ── GetControls sub-type enums ──
export const BUTTON_TYPES = ['Toggle', 'Momentary', 'Trigger', 'StateTrigger'];
export const INDICATOR_TYPES = ['Led', 'Meter', 'Text', 'Status'];
export const CONTROL_UNITS = ['dB', 'Hz', 'Float', 'Integer', 'Pan', 'Percent', 'Position', 'Seconds'];
export const PIN_STYLES = ['Input', 'Output', 'Both', 'None'];

// ── GetControlLayout Style enum ──
export const LAYOUT_STYLES = ['Fader', 'Knob', 'Button', 'Text', 'Meter', 'Led', 'ListBox', 'ComboBox', 'None'];

// ── Layout sub-type enums ──
export const BUTTON_STYLES = ['Toggle', 'Momentary', 'Trigger', 'StateTrigger', 'On', 'Off', 'Custom'];
export const BUTTON_VISUAL_STYLES = ['Flat', 'Gloss'];
export const METER_STYLES = ['Level', 'Reduction', 'Gain', 'Standard'];
export const TEXTBOX_STYLES = ['Normal', 'Meter', 'NoBackground'];
export const H_TEXT_ALIGNS = ['Center', 'Left', 'Right'];
export const V_TEXT_ALIGNS = ['Center', 'Top', 'Bottom'];

// ── Graphics Type enum ──
export const GRAPHIC_TYPES = ['Label', 'GroupBox', 'Header', 'image', 'svg'];

// ── Fonts available in Q-SYS ──
export const QSYS_FONTS = [
  'Adamina', 'Droid Sans', 'Lato', 'Montserrat', 'Noto Serif',
  'Open Sans', 'Poppins', 'Roboto', 'Roboto Mono', 'Roboto Slab', 'Slabo 27px'
];

export const FONT_STYLES = {
  'Adamina': ['Regular'],
  'Droid Sans': ['Regular', 'Bold'],
  'Lato': ['Light', 'Light Italic', 'Regular', 'Italic', 'Bold', 'Bold Italic', 'Black', 'Black Italic'],
  'Montserrat': ['Thin', 'Thin Italic', 'ExtraLight', 'ExtraLight Italic', 'Light', 'Light Italic', 'Regular', 'Italic', 'Medium', 'Medium Italic', 'SemiBold', 'SemiBold Italic', 'Bold', 'Bold Italic', 'ExtraBold', 'ExtraBold Italic', 'Black', 'Black Italic'],
  'Noto Serif': ['Regular', 'Italic', 'Bold', 'BoldItalic'],
  'Open Sans': ['Light', 'Light Italic', 'Regular', 'Italic', 'Semibold', 'Semibold Italic', 'Bold', 'Bold Italic', 'Extrabold', 'Extrabold Italic'],
  'Poppins': ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'],
  'Roboto': ['Thin', 'Thin Italic', 'Light', 'Light Italic', 'Regular', 'Italic', 'Medium', 'Medium Italic', 'Bold', 'Bold Italic', 'Black', 'Black Italic'],
  'Roboto Mono': ['Thin', 'Thin Italic', 'Light', 'Light Italic', 'Regular', 'Italic', 'Medium', 'Medium Italic', 'Bold', 'Bold Italic'],
  'Roboto Slab': ['Thin', 'Light', 'Regular', 'Bold'],
  'Slabo 27px': ['Regular'],
};

// ── Knob ControlUnit default ranges ──
export const KNOB_RANGES = {
  'dB':       { lowerLimit: -100, upperLimit: 20,    defaultMin: -100, defaultMax: 20,    required: true  },
  'Hz':       { lowerLimit: 20,   upperLimit: 20000, defaultMin: 20,   defaultMax: 20000, required: true  },
  'Float':    { lowerLimit: -1e9, upperLimit: 1e9,   defaultMin: 0,    defaultMax: 100,   required: true  },
  'Integer':  { lowerLimit: -999999999, upperLimit: 999999999, defaultMin: 1, defaultMax: 100, required: true },
  'Pan':      { lowerLimit: -1,   upperLimit: 1,     defaultMin: -1,   defaultMax: 1,     required: false },
  'Percent':  { lowerLimit: 0,    upperLimit: 100,   defaultMin: 0,    defaultMax: 100,   required: true  },
  'Position': { lowerLimit: 0,    upperLimit: 1,     defaultMin: 0,    defaultMax: 1,     required: false },
  'Seconds':  { lowerLimit: 0,    upperLimit: 87400, defaultMin: 0,    defaultMax: 1,     required: true  },
};

// ── Valid layout Styles per ControlType ──
export const STYLES_FOR_CONTROL_TYPE = {
  Button:    ['Button', 'Text', 'None'],
  Knob:      ['Knob', 'Fader', 'Text', 'None'],
  Indicator: ['Led', 'Meter', 'Text', 'None'],
  Text:      ['Text', 'ListBox', 'ComboBox', 'None'],
};

// ── Default objects when dragged from palette ──
export const CONTROL_DEFAULTS = {
  Button: {
    controlDef: {
      Name: 'Button',
      ControlType: 'Button',
      ButtonType: 'Momentary',
      UserPin: true,
      PinStyle: 'Both',
      Count: 1,
    },
    layoutProps: {
      Style: 'Button',
      ButtonStyle: 'Momentary',
      ButtonVisualStyle: 'Gloss',
      Color: [0, 0, 0],
    },
    w: 80,
    h: 32,
  },
  Knob: {
    controlDef: {
      Name: 'Knob',
      ControlType: 'Knob',
      ControlUnit: 'Percent',
      Min: 0,
      Max: 100,
      UserPin: true,
      PinStyle: 'Both',
      Count: 1,
    },
    layoutProps: {
      Style: 'Knob',
    },
    w: 48,
    h: 48,
  },
  Indicator: {
    controlDef: {
      Name: 'Indicator',
      ControlType: 'Indicator',
      IndicatorType: 'Led',
      UserPin: true,
      PinStyle: 'Input',
      Count: 1,
    },
    layoutProps: {
      Style: 'Led',
      Color: [0, 255, 0],
    },
    w: 16,
    h: 16,
  },
  Text: {
    controlDef: {
      Name: 'TextBox',
      ControlType: 'Text',
      UserPin: false,
      Count: 1,
    },
    layoutProps: {
      Style: 'Text',
      TextBoxStyle: 'Normal',
    },
    w: 120,
    h: 24,
  },
};

export const GRAPHIC_DEFAULTS = {
  Label: {
    graphicProps: {
      Type: 'Label',
      Text: 'Label',
      FontSize: 12,
      HTextAlign: 'Center',
      Color: [255, 255, 255],
    },
    w: 80,
    h: 20,
  },
  GroupBox: {
    graphicProps: {
      Type: 'GroupBox',
      Text: 'Group',
      Fill: [200, 200, 200],
      StrokeWidth: 1,
      StrokeColor: [128, 128, 128],
    },
    w: 200,
    h: 120,
  },
  Header: {
    graphicProps: {
      Type: 'Header',
      Text: 'Header',
      FontSize: 14,
      HTextAlign: 'Center',
      Color: [255, 255, 255],
    },
    w: 200,
    h: 24,
  },
  image: {
    graphicProps: {
      Type: 'image',
      Image: '',
    },
    w: 100,
    h: 100,
  },
  svg: {
    graphicProps: {
      Type: 'svg',
      Image: '',
    },
    w: 100,
    h: 100,
  },
};
