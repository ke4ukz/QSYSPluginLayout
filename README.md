# Q-SYS Plugin Layout Editor

<img width="1202" height="793" alt="image" src="https://github.com/user-attachments/assets/18ff4dc5-dfac-4aba-aa5d-19c4bb6c646e" />

A browser-based wireframe-style editor for designing Q-SYS plugin control layouts. Drag controls and graphics onto the canvas, configure their properties, and generate the Lua code for required methods (like `GetControls`, `GetControlLayout`, etc.) and stub `EventHandler` functions.

All project data is stored locally in your browser. Nothing is sent to or stored on any server.

## Project Structure

```
Website/           Main application files
  layout.html      Entry point
  style.css        Styles
  privacy.html     Privacy policy
  .htaccess        Server configuration
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
    undo-manager.js  Snapshot-based undo/redo
    settings.js      Persistent user settings
    event-bus.js     Pub/sub event system
    utils.js         Shared utilities
  help/            Help page
    help.html        Keyboard shortcuts, usage guide, known limitations
    .htaccess        Server configuration
Documentation/     Reference material
```

## Known Limitations

- Control appearance is a wireframe approximation, not pixel-accurate. Verify in Q-SYS Designer.
- Generated Lua code is a starting point — always review and test before deploying.
- Some layout properties are not yet supported (e.g., `ClassName`, `WordWrap`, `IconColor`, `CustomButtonUp/Down`). The `Media` layout style is not supported.
- Q-SYS Designer inverts certain colors between dark and light mode; this editor does not replicate that behavior.
- Font rendering may differ from Q-SYS Designer (browser fonts vs. Q-SYS font engine).
- Meter and fader previews are static and do not reflect signal levels or control positions.

See the [full known limitations list](Website/help/help.html#known-limitations) for more details.

## Troubleshooting

If the editor fails to load or behaves unexpectedly due to corrupted local storage, append `?reset=true` to the URL (e.g. `layout.html?reset=true`). This clears all saved data and settings, then redirects back to the clean URL.

## Disclaimer

This tool is provided as-is with no warranty, expressed or implied. Not affiliated with, endorsed by, or sponsored by QSC, LLC, Q-SYS, or Acuity Brands.

## AI Disclosure
Portions of this software was developed with the assisntance of an artificial intelligence agent.
