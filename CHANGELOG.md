# Changelog

## 1.0.0

### Features
- Wireframe canvas editor with drag, resize, and snap-to-grid
- Control types: Button, Knob/Fader, Indicator, Text (ComboBox, ListBox, Meter)
- Graphic types: Label, GroupBox, Header, Image, SVG
- Multi-page support with per-page canvas sizing
- Control arrays (Count > 1) with automatic sibling expansion
- Properties panel with full control/layout/graphic property editing
- RGBA color support: alpha channel (0–100%) for Color, Fill, and StrokeColor properties
- Outline view grouped by page, mirroring canvas selection
- Alignment, distribution, packing, sizing, and centering operations
- Configurable alignment anchor (first-selected or last-selected)
- Z-order management (bring to front, send to back)
- Lua code generation: `PluginInfo`, `GetProperties`, `GetControls`, `GetControlLayout`, `GetPages`, `EventHandler` stubs
- PluginInfo and GetProperties always emitted (required by Q-SYS); warning indicators when PluginInfo is incomplete
- Lua syntax highlighting in output panel with auto-generation (manual refresh available via icon)
- Save/load projects as JSON
- Auto-save to localStorage
- Undo/redo with coalesced drag and keyboard movement batching
- Keyboard shortcuts: arrow move/resize, delete, duplicate, select all, page navigation, alignment, z-order, undo/redo
- Shift+click toolbox items to add at canvas center
- Double-click canvas objects to focus Name/Text property
- Hold Ctrl/Cmd while dragging to bypass grid snapping
- Two-row toolbar: file/modal buttons on top, alignment/arrangement on bottom
- Dark/light canvas theme toggle for previewing layouts against both backgrounds
- Auto-generated Status control placed on canvas for new projects (configurable in settings)
- Improved control rendering: Knob (semicircle pie chart), Fader (orientation-aware with proportional track/thumb), Button (gloss effect), LED (circle), Meter (vertical bar fill)
- GroupBox renders with fieldset/legend style (text inset into top border), matching Q-SYS appearance
- DOM structure: outer `.canvas-object` (positioning, selection, resize handles) wrapping inner `.control-body` (visual content with overflow:hidden)
- Properties panel values apply on blur (click off) as well as Enter
- StrokeWidth validated to 0–64 range
- Grid, snap, and canvas size settings in Settings modal
- Application settings with persistent storage
- Audio/serial pin editor (`GetPins`) with toolbar modal
- Design-time property editor (`GetProperties` / `RectifyProperties` stub) with card-based modal
- Header comments in generated Lua (plugin name, author, auto-generated date)
- Persistent author name setting, auto-filled into PluginInfo Author
- Lua code highlighting when a control or graphic is selected on the canvas
- Toolbar buttons disable when selection count is insufficient for the operation
- Startup disclaimer modal with "Don't show again" option
- Known limitations section in help documentation
- Privacy policy page
- Emergency localStorage reset via `?reset=true` URL parameter
