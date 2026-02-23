import * as align from './alignment.js';

export class Toolbar {
  constructor(dataModel, selectionManager, canvasManager, eventBus, settings) {
    this.dataModel = dataModel;
    this.selection = selectionManager;
    this.canvas = canvasManager;
    this.eventBus = eventBus;
    this.settings = settings;

    this._bindAlignmentButtons();
    this._bindZOrderButtons();
    this._bindFileButtons();
    this._bindLuaPanel();
    this._bindPageEvents();
    this._bindSelectionState();
  }

  _getSelectedRects() {
    return this.selection.getSelectedIds().map(id => {
      const obj = this.dataModel.getObject(id);
      return { id: obj.id, x: obj.x, y: obj.y, w: obj.w, h: obj.h };
    });
  }

  _getAnchorRect(rects) {
    const anchor = this.settings.get('alignmentAnchor');
    return anchor === 'last' ? rects[rects.length - 1] : rects[0];
  }

  _apply(fn, minCount = 2, useAnchor = false) {
    const rects = this._getSelectedRects();
    if (rects.length < minCount) return;
    const updates = useAnchor ? fn(rects, this._getAnchorRect(rects)) : fn(rects);
    if (updates.length > 0) {
      this.dataModel.updateMultiple(updates);
    }
  }

  _applyWithCanvas(fn, minCount = 1) {
    const rects = this._getSelectedRects();
    if (rects.length < minCount) return;
    const updates = fn(rects, this.dataModel.canvasWidth, this.dataModel.canvasHeight);
    if (updates.length > 0) {
      this.dataModel.updateMultiple(updates);
    }
  }

  _bindAlignmentButtons() {
    const bind = (id, fn, min, useAnchor = false) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => this._apply(fn, min, useAnchor));
    };
    const bindCanvas = (id, fn, min) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => this._applyWithCanvas(fn, min));
    };

    // Alignment (2+ selected, anchored)
    bind('btn-align-left', align.alignLeft, 2, true);
    bind('btn-align-center-h', align.alignCenterHorizontal, 2, true);
    bind('btn-align-right', align.alignRight, 2, true);
    bind('btn-align-top', align.alignTop, 2, true);
    bind('btn-align-center-v', align.alignCenterVertical, 2, true);
    bind('btn-align-bottom', align.alignBottom, 2, true);

    // Distribution (3+ selected, no anchor)
    bind('btn-dist-h', align.distributeHorizontally, 3);
    bind('btn-dist-v', align.distributeVertically, 3);

    // Sizing (2+ selected, anchored)
    bind('btn-same-width', align.makeSameWidth, 2, true);
    bind('btn-same-height', align.makeSameHeight, 2, true);
    bind('btn-same-size', align.makeSameSize, 2, true);

    // Packing (2+ selected, no anchor)
    bind('btn-pack-left', align.packLeft, 2);
    bind('btn-pack-right', align.packRight, 2);
    bind('btn-pack-top', align.packTop, 2);
    bind('btn-pack-bottom', align.packBottom, 2);

    // Center on page (1+ selected, needs canvas dims)
    bindCanvas('btn-center-page-h', (rects, cw) => align.centerOnPageHorizontal(rects, cw), 1);
    bindCanvas('btn-center-page-v', (rects, _cw, ch) => align.centerOnPageVertical(rects, ch), 1);

    // Space evenly (2+ selected, needs canvas dims)
    bindCanvas('btn-space-even-h', (rects, cw) => align.spaceEvenlyHorizontal(rects, cw), 2);
    bindCanvas('btn-space-even-v', (rects, _cw, ch) => align.spaceEvenlyVertical(rects, ch), 2);
  }

  _bindZOrderButtons() {
    const btnFront = document.getElementById('btn-bring-front');
    const btnBack = document.getElementById('btn-send-back');

    if (btnFront) {
      btnFront.addEventListener('click', () => {
        const ids = this.selection.getSelectedIds();
        if (ids.length > 0) this.dataModel.bringToFront(ids);
      });
    }
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        const ids = this.selection.getSelectedIds();
        if (ids.length > 0) this.dataModel.sendToBack(ids);
      });
    }
  }

  _bindFileButtons() {
    const btnNew = document.getElementById('btn-new');
    const btnSave = document.getElementById('btn-save');
    const btnLoad = document.getElementById('btn-load');
    const fileInput = document.getElementById('file-input');

    if (btnNew) {
      btnNew.addEventListener('click', () => {
        if (this.dataModel.objects.length === 0 || confirm('Start a new project? Unsaved changes will be lost.')) {
          this.selection.clearSelection();
          this.dataModel.clear();
        }
      });
    }

    if (btnSave) {
      btnSave.addEventListener('click', () => {
        const json = JSON.stringify(this.dataModel.toJSON(), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qsys-layout.json';
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (btnLoad && fileInput) {
      btnLoad.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const json = JSON.parse(reader.result);
            this.selection.clearSelection();
            this.dataModel.fromJSON(json);
          } catch (e) {
            alert('Failed to load project: ' + e.message);
          }
        };
        reader.readAsText(file);
        fileInput.value = '';
      });
    }
  }

  _bindPageEvents() {
    const sync = () => {
      const wInput = document.getElementById('canvas-width');
      const hInput = document.getElementById('canvas-height');
      if (wInput) wInput.value = this.dataModel.canvasWidth;
      if (hInput) hInput.value = this.dataModel.canvasHeight;
    };
    this.eventBus.on('page:switched', sync);
    this.eventBus.on('model:loaded', sync);
  }

  _bindSelectionState() {
    // [buttonId, minSelected]
    const rules = [
      // Alignment (2+)
      ['btn-align-left', 2], ['btn-align-center-h', 2], ['btn-align-right', 2],
      ['btn-align-top', 2], ['btn-align-center-v', 2], ['btn-align-bottom', 2],
      // Distribution (3+)
      ['btn-dist-h', 3], ['btn-dist-v', 3],
      // Sizing (2+)
      ['btn-same-width', 2], ['btn-same-height', 2], ['btn-same-size', 2],
      // Packing (2+)
      ['btn-pack-left', 2], ['btn-pack-right', 2], ['btn-pack-top', 2], ['btn-pack-bottom', 2],
      // Space evenly (2+)
      ['btn-space-even-h', 2], ['btn-space-even-v', 2],
      // Center on page (1+)
      ['btn-center-page-h', 1], ['btn-center-page-v', 1],
      // Z-order (1+)
      ['btn-bring-front', 1], ['btn-send-back', 1],
    ];

    const entries = rules.map(([id, min]) => [document.getElementById(id), min]).filter(([el]) => el);

    const update = (ids) => {
      const count = ids.length;
      for (const [el, min] of entries) {
        el.disabled = count < min;
      }
    };

    this.eventBus.on('selection:changed', update);
    update([]); // initial state — nothing selected
  }

  _bindLuaPanel() {
    const btnToggle = document.getElementById('btn-toggle-lua');
    const btnMaximize = document.getElementById('btn-maximize-lua');
    const luaPanel = document.getElementById('lua-panel');
    const btnCopy = document.getElementById('btn-copy-lua');
    const luaOutput = document.getElementById('lua-output');

    if (btnToggle && luaPanel) {
      btnToggle.addEventListener('click', () => {
        luaPanel.classList.toggle('collapsed');
        if (luaPanel.classList.contains('collapsed')) {
          luaPanel.classList.remove('maximized');
          btnMaximize.textContent = '\u2922';
        }
        btnToggle.textContent = luaPanel.classList.contains('collapsed') ? '\u25B6' : '\u25BC';
      });
    }

    if (btnMaximize && luaPanel) {
      btnMaximize.addEventListener('click', () => {
        luaPanel.classList.remove('collapsed');
        luaPanel.classList.toggle('maximized');
        btnToggle.textContent = '\u25BC';
        btnMaximize.textContent = luaPanel.classList.contains('maximized') ? '\u2923' : '\u2922';
      });
    }

    if (btnCopy && luaOutput) {
      btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(luaOutput.textContent).catch(() => {
          const range = document.createRange();
          range.selectNodeContents(luaOutput);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('copy');
          sel.removeAllRanges();
        });
      });
    }
  }
}
