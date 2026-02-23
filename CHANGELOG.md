# Changelog

## 0.1.0

### Features
- WYSIWYG canvas editor with drag, resize, and snap-to-grid
- Control types: Button, Knob/Fader, Indicator, Text (ComboBox, ListBox, Meter)
- Graphic types: Label, GroupBox, Header, Image, SVG
- Multi-page support with per-page canvas sizing
- Control arrays (Count > 1) with automatic sibling expansion
- Properties panel with full control/layout/graphic property editing
- Outline view grouped by page, mirroring canvas selection
- Alignment, distribution, packing, sizing, and centering operations
- Configurable alignment anchor (first-selected or last-selected)
- Z-order management (bring to front, send to back)
- Lua code generation: `GetControls`, `GetControlLayout`, `GetPages`, `EventHandler` stubs
- Lua syntax highlighting in output panel
- Save/load projects as JSON
- Auto-save to localStorage
- Keyboard shortcuts: arrow move/resize, delete, duplicate, select all, page navigation
- Application settings with persistent storage
- Audio/serial pin editor (`GetPins`) with toolbar modal
- Design-time property editor (`GetProperties` / `RectifyProperties` stub) with card-based modal
- Header comments in generated Lua (plugin name, author, auto-generated date)
- Persistent author name setting, auto-filled into PluginInfo Author
- Lua code highlighting when a control or graphic is selected on the canvas
- Toolbar buttons disable when selection count is insufficient for the operation
- Emergency localStorage reset via `?reset=true` URL parameter
