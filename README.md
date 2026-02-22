# Q-SYS Plugin Layout Editor

A browser-based WYSIWYG editor for designing Q-SYS plugin control layouts. Drag controls and graphics onto the canvas, configure their properties, and generate the Lua code for `GetControls`, `GetControlLayout`, `GetPages`, and stub `EventHandler` functions.

All project data is stored locally in your browser. Nothing is sent to or stored on any server.

## Getting Started

Open `Website/layout.html` in a browser. No build tools or dependencies required.

## Project Structure

```
Website/           Main application files
  layout.html      Entry point
  style.css        Styles
  js/              Application modules
    main.js          App initialization and wiring
    data-model.js    Core data model and object CRUD
    canvas.js        Canvas rendering and drag interaction
    canvas-object.js DOM element creation for canvas objects
    properties-panel.js  Property editing UI
    toolbar.js       Toolbar button bindings
    toolbox.js       Control/graphic palette and drag-to-create
    outline.js       Outline view (object list grouped by page)
    page-tabs.js     Multi-page tab bar
    alignment.js     Alignment, distribution, and sizing operations
    lua-codegen.js   Lua code generation
    lua-highlight.js Lua syntax highlighting
    schema.js        Control and graphic type defaults
    selection.js     Selection state management
    settings.js      Persistent user settings
    event-bus.js     Pub/sub event system
    utils.js         Shared utilities
Documentation/     Reference material
```

## Disclaimer

This tool is provided as-is with no warranty, expressed or implied. Not affiliated with, endorsed by, or sponsored by QSC, LLC, Q-SYS, or Acuity Brands.
