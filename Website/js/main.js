import { EventBus } from './event-bus.js';
import { Settings } from './settings.js';
import { DataModel } from './data-model.js';
import { SelectionManager } from './selection.js';
import { CanvasManager } from './canvas.js';
import { Toolbox } from './toolbox.js';
import { PropertiesPanel } from './properties-panel.js';
import { Toolbar } from './toolbar.js';
import { PageTabs } from './page-tabs.js';
import { Outline } from './outline.js';
import { generateLua } from './lua-codegen.js';
import { highlightLua } from './lua-highlight.js';

// ── Initialize ──
const eventBus = new EventBus();
const settings = new Settings(eventBus);
const dataModel = new DataModel(eventBus, settings);
const selection = new SelectionManager(eventBus);
const canvas = new CanvasManager(dataModel, selection, eventBus);
const toolbox = new Toolbox(dataModel, canvas, eventBus, settings);
const propertiesPanel = new PropertiesPanel(dataModel, selection, eventBus);
const toolbar = new Toolbar(dataModel, selection, canvas, eventBus, settings);
const pageTabs = new PageTabs(dataModel, selection, eventBus);
const outline = new Outline(dataModel, selection, eventBus);

// ── Apply saved settings on startup ──
{
  const gridSizeInput = document.getElementById('grid-size');
  const chkGrid = document.getElementById('chk-grid');
  const chkSnap = document.getElementById('chk-snap');
  const canvasW = document.getElementById('canvas-width');
  const canvasH = document.getElementById('canvas-height');

  const gs = settings.get('gridSize');
  const snap = settings.get('snapToGrid');
  const showGrid = settings.get('showGrid');
  const cw = settings.get('canvasWidth');
  const ch = settings.get('canvasHeight');

  gridSizeInput.value = gs;
  chkGrid.checked = showGrid;
  chkSnap.checked = snap;
  canvasW.value = cw;
  canvasH.value = ch;

  canvas.setGridSize(gs);
  canvas.setShowGrid(showGrid);
  canvas.setSnapEnabled(snap);
  dataModel.setCanvasSize(cw, ch);
}

// ── Settings modal ──
{
  const btnSettings = document.getElementById('btn-settings');
  const overlay = document.getElementById('settings-overlay');
  const btnSave = document.getElementById('settings-save');
  const btnCancel = document.getElementById('settings-cancel');
  const btnClose = document.getElementById('settings-close');

  const fields = {
    defaultUserPin: document.getElementById('setting-default-user-pin'),
    defaultPinStyle: document.getElementById('setting-default-pin-style'),
    autoAddLabel: document.getElementById('setting-auto-add-label'),
    alignmentAnchor: document.getElementById('setting-alignment-anchor'),
    gridSize: document.getElementById('setting-grid-size'),
    snapToGrid: document.getElementById('setting-snap'),
    showGrid: document.getElementById('setting-show-grid'),
    canvasWidth: document.getElementById('setting-canvas-width'),
    canvasHeight: document.getElementById('setting-canvas-height'),
    autoGenerateStatus: document.getElementById('setting-auto-generate-status'),
  };

  function populateModal() {
    const vals = settings.getAll();
    fields.defaultUserPin.checked = vals.defaultUserPin;
    fields.defaultPinStyle.value = vals.defaultPinStyle;
    fields.autoAddLabel.checked = vals.autoAddLabel;
    fields.alignmentAnchor.value = vals.alignmentAnchor;
    fields.autoGenerateStatus.checked = vals.autoGenerateStatus;
    fields.gridSize.value = vals.gridSize;
    fields.snapToGrid.checked = vals.snapToGrid;
    fields.showGrid.checked = vals.showGrid;
    fields.canvasWidth.value = vals.canvasWidth;
    fields.canvasHeight.value = vals.canvasHeight;
  }

  function closeModal() {
    overlay.hidden = true;
  }

  btnSettings.addEventListener('click', () => {
    populateModal();
    overlay.hidden = false;
  });

  btnCancel.addEventListener('click', closeModal);
  btnClose.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  btnSave.addEventListener('click', () => {
    settings.setAll({
      defaultUserPin: fields.defaultUserPin.checked,
      defaultPinStyle: fields.defaultPinStyle.value,
      autoAddLabel: fields.autoAddLabel.checked,
      alignmentAnchor: fields.alignmentAnchor.value,
      autoGenerateStatus: fields.autoGenerateStatus.checked,
      gridSize: parseInt(fields.gridSize.value) || 10,
      snapToGrid: fields.snapToGrid.checked,
      showGrid: fields.showGrid.checked,
      canvasWidth: parseInt(fields.canvasWidth.value) || 400,
      canvasHeight: parseInt(fields.canvasHeight.value) || 300,
    });
    closeModal();
  });
}

// ── PluginInfo modal ──
{
  const btnPluginInfo = document.getElementById('btn-plugin-info');
  const overlay = document.getElementById('plugininfo-overlay');
  const btnSave = document.getElementById('plugininfo-save');
  const btnCancel = document.getElementById('plugininfo-cancel');
  const btnClose = document.getElementById('plugininfo-close');
  const btnClear = document.getElementById('plugininfo-clear');
  const btnGenerateId = document.getElementById('pi-generate-id');

  const piFields = {
    Name: document.getElementById('pi-name'),
    Version: document.getElementById('pi-version'),
    Id: document.getElementById('pi-id'),
    Description: document.getElementById('pi-description'),
    BuildVersion: document.getElementById('pi-build-version'),
    Author: document.getElementById('pi-author'),
    Manufacturer: document.getElementById('pi-manufacturer'),
    Model: document.getElementById('pi-model'),
    IsManaged: document.getElementById('pi-is-managed'),
    Type: document.getElementById('pi-type'),
    ShowDebug: document.getElementById('pi-show-debug'),
  };

  function populatePluginInfo() {
    const pi = dataModel.getPluginInfo() || {};
    piFields.Name.value = pi.Name || '';
    piFields.Version.value = pi.Version || '';
    piFields.Id.value = pi.Id || '';
    piFields.Description.value = pi.Description || '';
    piFields.BuildVersion.value = pi.BuildVersion || '';
    piFields.Author.value = pi.Author || '';
    piFields.Manufacturer.value = pi.Manufacturer || '';
    piFields.Model.value = pi.Model || '';
    piFields.IsManaged.checked = !!pi.IsManaged;
    piFields.Type.value = pi.Type || '';
    piFields.ShowDebug.checked = !!pi.ShowDebug;
  }

  function closePluginInfo() {
    overlay.hidden = true;
  }

  function generateUUID() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  btnPluginInfo.addEventListener('click', () => {
    populatePluginInfo();
    overlay.hidden = false;
  });

  btnGenerateId.addEventListener('click', () => {
    piFields.Id.value = generateUUID();
  });

  btnSave.addEventListener('click', () => {
    const info = {
      Name: piFields.Name.value.trim(),
      Version: piFields.Version.value.trim(),
      Id: piFields.Id.value.trim(),
      Description: piFields.Description.value.trim(),
      BuildVersion: piFields.BuildVersion.value.trim(),
      Author: piFields.Author.value.trim(),
      Manufacturer: piFields.Manufacturer.value.trim(),
      Model: piFields.Model.value.trim(),
      IsManaged: piFields.IsManaged.checked,
      Type: piFields.Type.value.trim(),
      ShowDebug: piFields.ShowDebug.checked,
    };
    const hasContent = info.Name || info.Version || info.Id || info.Description ||
      info.BuildVersion || info.Author || info.Manufacturer || info.Model ||
      info.IsManaged || info.Type || info.ShowDebug;
    dataModel.setPluginInfo(hasContent ? info : null);
    closePluginInfo();
    refreshLua();
    autosave();
  });

  btnClear.addEventListener('click', () => {
    for (const [, el] of Object.entries(piFields)) {
      if (el.type === 'checkbox') el.checked = false;
      else el.value = '';
    }
  });

  btnCancel.addEventListener('click', closePluginInfo);
  btnClose.addEventListener('click', closePluginInfo);
  overlay.addEventListener('click', e => { if (e.target === overlay) closePluginInfo(); });
}

// ── Pins modal ──
{
  const btnPins = document.getElementById('btn-pins');
  const overlay = document.getElementById('pins-overlay');
  const btnSave = document.getElementById('pins-save');
  const btnCancel = document.getElementById('pins-cancel');
  const btnClose = document.getElementById('pins-close');
  const btnClear = document.getElementById('pins-clear');
  const btnAdd = document.getElementById('pins-add');
  const pinsList = document.getElementById('pins-list');

  let editingPins = [];

  function renderPinRows() {
    pinsList.innerHTML = '';
    if (editingPins.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'pins-empty';
      empty.textContent = 'No pins defined.';
      pinsList.appendChild(empty);
      return;
    }
    editingPins.forEach((pin, i) => {
      const row = document.createElement('div');
      row.className = 'pin-row';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = 'Pin name';
      nameInput.value = pin.Name;
      nameInput.addEventListener('input', () => { editingPins[i].Name = nameInput.value; });

      const dirSelect = document.createElement('select');
      for (const val of ['input', 'output']) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        if (pin.Direction === val) opt.selected = true;
        dirSelect.appendChild(opt);
      }
      dirSelect.addEventListener('change', () => { editingPins[i].Direction = dirSelect.value; });

      const domainSelect = document.createElement('select');
      for (const val of ['audio', 'serial']) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        if (pin.Domain === val) opt.selected = true;
        domainSelect.appendChild(opt);
      }
      domainSelect.addEventListener('change', () => { editingPins[i].Domain = domainSelect.value; });

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '\u00D7';
      removeBtn.title = 'Remove pin';
      removeBtn.addEventListener('click', () => {
        editingPins.splice(i, 1);
        renderPinRows();
      });

      row.append(nameInput, dirSelect, domainSelect, removeBtn);
      pinsList.appendChild(row);
    });
  }

  function openPins() {
    editingPins = dataModel.getPins().map(p => ({ ...p }));
    renderPinRows();
    overlay.hidden = false;
  }

  function closePins() {
    overlay.hidden = true;
  }

  btnPins.addEventListener('click', openPins);

  btnAdd.addEventListener('click', () => {
    editingPins.push({ Name: '', Direction: 'input', Domain: 'audio' });
    renderPinRows();
    // Focus the new name input
    const inputs = pinsList.querySelectorAll('input[type="text"]');
    if (inputs.length > 0) inputs[inputs.length - 1].focus();
  });

  btnClear.addEventListener('click', () => {
    editingPins = [];
    renderPinRows();
  });

  btnSave.addEventListener('click', () => {
    // Filter out pins with empty names
    const validPins = editingPins
      .filter(p => p.Name.trim())
      .map(p => ({ Name: p.Name.trim(), Direction: p.Direction, Domain: p.Domain }));
    dataModel.setPins(validPins);
    closePins();
    refreshLua();
    autosave();
  });

  btnCancel.addEventListener('click', closePins);
  btnClose.addEventListener('click', closePins);
  overlay.addEventListener('click', e => { if (e.target === overlay) closePins(); });
}

// ── Help window ──
{
  const btnHelp = document.getElementById('btn-help');
  btnHelp.addEventListener('click', () => {
    const w = Math.round(window.innerWidth * 0.5);
    const h = window.innerHeight;
    window.open('help/', 'qsys-layout-help', `width=${w},height=${h},resizable=yes,scrollbars=yes`);
  });
}

// ── About modal ──
{
  const btnAbout = document.getElementById('btn-about');
  const aboutOverlay = document.getElementById('about-overlay');
  const btnOk = document.getElementById('about-ok');
  const btnClose = document.getElementById('about-close');

  const close = () => { aboutOverlay.hidden = true; };
  btnAbout.addEventListener('click', () => { aboutOverlay.hidden = false; });
  btnOk.addEventListener('click', close);
  btnClose.addEventListener('click', close);
  aboutOverlay.addEventListener('click', e => { if (e.target === aboutOverlay) close(); });
}

// ── Select newly created objects ──
eventBus.on('toolbox:object-created', obj => {
  selection.select(obj.id);
});

// ── Clean up selection when objects removed ──
eventBus.on('object:removed', obj => {
  selection.handleObjectRemoved(obj.id);
});

// ── Lua generation (auto-updates on any model change) ──
const btnGenerate = document.getElementById('btn-generate-lua');
const luaOutput = document.getElementById('lua-output');

function refreshLua() {
  const code = generateLua(dataModel, settings);
  luaOutput.innerHTML = highlightLua(code);
}

if (btnGenerate) {
  btnGenerate.addEventListener('click', refreshLua);
}

eventBus.on('object:added', refreshLua);
eventBus.on('object:removed', refreshLua);
eventBus.on('object:updated', refreshLua);
eventBus.on('objects:bulk-updated', refreshLua);
eventBus.on('model:loaded', refreshLua);
eventBus.on('page:added', refreshLua);
eventBus.on('page:removed', refreshLua);
eventBus.on('page:renamed', refreshLua);
eventBus.on('page:switched', refreshLua);
eventBus.on('pluginInfo:changed', refreshLua);
eventBus.on('pins:changed', refreshLua);
eventBus.on('settings:changed', refreshLua);

// Clear selection on page switch (defensive — PageTabs also clears on click)
eventBus.on('page:switched', () => selection.clearSelection());

// ── Auto-save to localStorage ──
const AUTOSAVE_KEY = 'qsys-layout-autosave';
let _autosaveTimer = null;

function autosave() {
  clearTimeout(_autosaveTimer);
  _autosaveTimer = setTimeout(() => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(dataModel.toJSON()));
    } catch (e) {
      // localStorage full or unavailable — silently ignore
    }
  }, 500);
}

// Save on every model change (debounced)
eventBus.on('object:added', autosave);
eventBus.on('object:removed', autosave);
eventBus.on('object:updated', autosave);
eventBus.on('objects:bulk-updated', autosave);
eventBus.on('model:loaded', autosave);
eventBus.on('page:added', autosave);
eventBus.on('page:removed', autosave);
eventBus.on('page:renamed', autosave);
eventBus.on('canvas:resized', autosave);
eventBus.on('pluginInfo:changed', autosave);
eventBus.on('pins:changed', autosave);

// Flush immediately when leaving the page
window.addEventListener('beforeunload', () => {
  clearTimeout(_autosaveTimer);
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(dataModel.toJSON()));
  } catch (e) { /* ignore */ }
});

// Restore on startup
try {
  const saved = localStorage.getItem(AUTOSAVE_KEY);
  if (saved) {
    const json = JSON.parse(saved);
    if (json && json.objects && json.objects.length > 0) {
      dataModel.fromJSON(json);
    }
  }
} catch (e) {
  // Corrupted data — ignore and start fresh
}

// Show boilerplate on initial load
refreshLua();

// Ensure manual copy from the Lua panel copies plain text only
document.getElementById('lua-output-wrap').addEventListener('copy', e => {
  const sel = window.getSelection();
  if (sel) {
    e.preventDefault();
    e.clipboardData.setData('text/plain', sel.toString());
  }
});

// ── Keyboard shortcuts ──
document.addEventListener('keydown', e => {
  // Don't handle shortcuts when typing in inputs
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  const ids = selection.getSelectedIds();

  // Delete
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    if (ids.length > 0) {
      dataModel.removeObjects(ids);
    }
    return;
  }

  // Select All
  if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    e.preventDefault();
    selection.selectMultiple(dataModel.getAllObjects().map(o => o.id));
    return;
  }

  // Duplicate
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault();
    if (ids.length > 0) {
      const dupes = dataModel.duplicateObjects(ids);
      selection.selectMultiple(dupes.map(d => d.id));
    }
    return;
  }

  // Escape — deselect
  if (e.key === 'Escape') {
    selection.clearSelection();
    return;
  }

  // Page navigation: Ctrl+PageDown / Ctrl+PageUp
  if ((e.ctrlKey || e.metaKey) && e.key === 'PageDown') {
    e.preventDefault();
    const pages = dataModel.getPages();
    const idx = dataModel.getCurrentPageIndex();
    if (idx < pages.length - 1) {
      selection.clearSelection();
      dataModel.switchPage(pages[idx + 1].id);
    }
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'PageUp') {
    e.preventDefault();
    const pages = dataModel.getPages();
    const idx = dataModel.getCurrentPageIndex();
    if (idx > 0) {
      selection.clearSelection();
      dataModel.switchPage(pages[idx - 1].id);
    }
    return;
  }

  // Arrow keys — move (default) or resize (shift)
  // Ctrl/Cmd = 1px steps, otherwise grid-size steps
  const arrowMap = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (arrowMap[e.key] && ids.length > 0) {
    e.preventDefault();
    const [dx, dy] = arrowMap[e.key];
    const fine = e.ctrlKey || e.metaKey;
    const step = fine ? 1 : (canvas.snapEnabled ? canvas.gridSize : 1);

    if (e.shiftKey) {
      // Shift+Arrow = resize (width for left/right, height for up/down)
      const updates = ids.map(id => {
        const obj = dataModel.getObject(id);
        return { id, changes: {
          w: Math.max(8, obj.w + dx * step),
          h: Math.max(8, obj.h + dy * step),
        }};
      });
      dataModel.updateMultiple(updates);
    } else {
      // Arrow = move
      const updates = ids.map(id => {
        const obj = dataModel.getObject(id);
        return { id, changes: { x: Math.max(0, obj.x + dx * step), y: Math.max(0, obj.y + dy * step) } };
      });
      dataModel.updateMultiple(updates);
    }
    return;
  }
});

// ── Remove old script.js behavior ──
// (the old script.js is no longer loaded since layout.html was rewritten)
