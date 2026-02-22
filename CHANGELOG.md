# Changelog

## 0.1.0 — 2026-02-22

Initial release.

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
