import { createObjectElement, updateObjectElement } from './canvas-object.js';

export class CanvasManager {
  constructor(dataModel, selectionManager, eventBus) {
    this.dataModel = dataModel;
    this.selection = selectionManager;
    this.eventBus = eventBus;

    this.canvasEl = document.getElementById('canvas');
    this.viewport = document.getElementById('canvas-viewport');
    this.selectionRectEl = document.getElementById('selection-rect');
    this.targetSizeEl = document.getElementById('target-size-rect');
    this.bboxEl = document.getElementById('bounding-box-rect');
    this.bboxLabel = this.bboxEl.querySelector('.bbox-label');
    this._elements = new Map(); // id -> DOM element

    this.gridSize = 10;
    this.showGrid = true;
    this.snapEnabled = true;

    this._setupGrid();
    this._updateCanvasLayout();
    this._bindEvents();
    this._bindModelEvents();
  }

  _setupGrid() {
    if (this.showGrid) {
      this.canvasEl.classList.add('show-grid');
    }
    this._updateGridSize();
  }

  _updateGridSize() {
    this.canvasEl.style.backgroundSize = `${this.gridSize}px ${this.gridSize}px`;
  }

  _maybeUpdateLayout() {
    if (!this._dragState) this._updateCanvasLayout();
  }

  _updateCanvasLayout() {
    const bbox = this.dataModel.getVisibleBoundingBox();
    const tw = this.dataModel.canvasWidth;
    const th = this.dataModel.canvasHeight;

    // Viewport inner size (subtract padding)
    const vpW = this.viewport.clientWidth - 80;
    const vpH = this.viewport.clientHeight - 80;

    // Canvas = max of target, bounding box, viewport + extra working space
    const PADDING = 200;
    const canvasW = Math.max(tw, bbox.w, vpW) + PADDING;
    const canvasH = Math.max(th, bbox.h, vpH) + PADDING;
    this.canvasEl.style.width = canvasW + 'px';
    this.canvasEl.style.height = canvasH + 'px';

    // Target size overlay
    this.targetSizeEl.style.width = tw + 'px';
    this.targetSizeEl.style.height = th + 'px';

    // Bounding box overlay
    if (bbox.w > 0 && bbox.h > 0) {
      this.bboxEl.classList.remove('empty');
      this.bboxEl.style.width = bbox.w + 'px';
      this.bboxEl.style.height = bbox.h + 'px';
      this.bboxLabel.textContent = `${bbox.w} \u00d7 ${bbox.h}`;
    } else {
      this.bboxEl.classList.add('empty');
    }
  }

  setGridSize(size) {
    this.gridSize = size;
    this._updateGridSize();
  }

  setShowGrid(show) {
    this.showGrid = show;
    this.canvasEl.classList.toggle('show-grid', show);
  }

  setSnapEnabled(snap) {
    this.snapEnabled = snap;
  }

  // ── Model event handlers ──

  _bindModelEvents() {
    this.eventBus.on('object:added', obj => { this._addElement(obj); this._maybeUpdateLayout(); });
    this.eventBus.on('object:removed', obj => { this._removeElement(obj.id); this._maybeUpdateLayout(); });
    this.eventBus.on('object:updated', obj => { this._updateElement(obj); this._maybeUpdateLayout(); });
    this.eventBus.on('objects:bulk-updated', objects => {
      for (const obj of objects) this._updateElement(obj);
      this._maybeUpdateLayout();
    });
    this.eventBus.on('model:loaded', () => this._rebuildAll());
    this.eventBus.on('canvas:resized', () => this._updateCanvasLayout());
    this.eventBus.on('selection:changed', ids => this._updateSelectionVisuals(ids));
    this.eventBus.on('page:switched', () => this._rebuildAll());
    this.eventBus.on('page:removed', () => this._rebuildAll());
  }

  _addElement(obj) {
    const el = createObjectElement(obj);
    this.canvasEl.appendChild(el);
    this._elements.set(obj.id, el);
    // Refresh sibling highlights in case this is a new array member
    this._updateSelectionVisuals(this.selection.getSelectedIds());
  }

  _removeElement(id) {
    const el = this._elements.get(id);
    if (el) {
      el.remove();
      this._elements.delete(id);
    }
  }

  _updateElement(obj) {
    const el = this._elements.get(obj.id);
    const visible = obj.pageId === null || obj.pageId === this.dataModel.currentPageId;

    if (visible && !el) {
      // Object became visible on this page (e.g. pageId changed to current or null)
      this._addElement(obj);
    } else if (!visible && el) {
      // Object moved to another page — remove from canvas
      this._removeElement(obj.id);
    } else if (visible && el) {
      updateObjectElement(el, obj);
    }
  }

  _rebuildAll() {
    // Remove all existing elements
    for (const el of this._elements.values()) {
      el.remove();
    }
    this._elements.clear();

    // Rebuild from model
    this._updateCanvasLayout();
    for (const obj of this.dataModel.getAllObjects()) {
      this._addElement(obj);
    }
  }

  _updateSelectionVisuals(selectedIds) {
    const idSet = new Set(selectedIds);

    // Collect arrayGroup IDs of selected objects to highlight siblings
    const selectedGroups = new Set();
    for (const id of selectedIds) {
      const obj = this.dataModel.getObject(id);
      if (obj && obj.arrayGroup) selectedGroups.add(obj.arrayGroup);
    }

    for (const [id, el] of this._elements) {
      el.classList.toggle('selected', idSet.has(id));
      // Highlight unselected siblings of selected array members
      if (!idSet.has(id)) {
        const obj = this.dataModel.getObject(id);
        el.classList.toggle('array-sibling', !!(obj && obj.arrayGroup && selectedGroups.has(obj.arrayGroup)));
      } else {
        el.classList.remove('array-sibling');
      }
    }
  }

  // ── Mouse event handling ──

  _bindEvents() {
    this.canvasEl.addEventListener('mousedown', e => this._onMouseDown(e));
    document.addEventListener('mousemove', e => this._onMouseMove(e));
    document.addEventListener('mouseup', e => this._onMouseUp(e));
  }

  _canvasCoords(e) {
    const rect = this.canvasEl.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  // ── Interaction state ──
  _dragState = null;

  _onMouseDown(e) {
    if (e.button !== 0) return;
    const pos = this._canvasCoords(e);
    const client = { x: e.clientX, y: e.clientY };

    // Check if clicking a resize handle
    const handleEl = e.target.closest('.resize-handle');
    if (handleEl) {
      e.preventDefault();
      e.stopPropagation();
      const objEl = handleEl.closest('.canvas-object');
      const id = objEl.dataset.id;
      const obj = this.dataModel.getObject(id);
      this._dragState = {
        type: 'resize',
        dir: handleEl.dataset.dir,
        ids: this.selection.getSelectedIds(),
        startClient: client,
        originals: this._snapshotSelected(),
      };
      return;
    }

    // Check if clicking a canvas object
    const objEl = e.target.closest('.canvas-object');
    if (objEl) {
      e.preventDefault();
      const id = objEl.dataset.id;

      if (e.shiftKey) {
        this.selection.toggleSelection(id);
      } else if (!this.selection.isSelected(id)) {
        this.selection.select(id);
      }
      // In all cases, prepare for potential drag
      this._dragState = {
        type: 'move',
        ids: this.selection.getSelectedIds(),
        startClient: client,
        originals: this._snapshotSelected(),
        hasMoved: false,
      };
      return;
    }

    // Clicking on empty canvas — start rubber band (uses canvas coords)
    if (e.target === this.canvasEl || e.target === this.selectionRectEl) {
      if (!e.shiftKey) {
        this.selection.clearSelection();
      }
      this._dragState = {
        type: 'rubberband',
        startMouse: pos,
        additive: e.shiftKey,
        priorSelection: e.shiftKey ? this.selection.getSelectedIds() : [],
      };
      this.selectionRectEl.hidden = false;
      this._updateRubberBand(pos, pos);
    }
  }

  _onMouseMove(e) {
    if (!this._dragState) return;
    const ds = this._dragState;

    if (ds.type === 'move') {
      ds.hasMoved = true;
      // Use screen-space delta (immune to canvas resizing during drag)
      const dx = e.clientX - ds.startClient.x;
      const dy = e.clientY - ds.startClient.y;
      const updates = ds.ids.map(id => {
        const orig = ds.originals.get(id);
        let newX = orig.x + dx;
        let newY = orig.y + dy;
        if (this.snapEnabled) {
          newX = this._snap(newX);
          newY = this._snap(newY);
        }
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);
        return { id, changes: { x: newX, y: newY } };
      });
      this.dataModel.updateMultiple(updates);
    }

    if (ds.type === 'resize') {
      // Use screen-space delta (immune to canvas resizing during drag)
      const dx = e.clientX - ds.startClient.x;
      const dy = e.clientY - ds.startClient.y;
      const updates = ds.ids.map(id => {
        const orig = ds.originals.get(id);
        return { id, changes: this._computeResize(orig, ds.dir, dx, dy) };
      });
      this.dataModel.updateMultiple(updates);
    }

    if (ds.type === 'rubberband') {
      // Rubber band uses canvas coords (needs to draw the selection rect on canvas)
      const pos = this._canvasCoords(e);
      this._updateRubberBand(ds.startMouse, pos);
      const rect = this._normalizeRect(ds.startMouse, pos);
      const hits = this.selection.getObjectsInRect(rect, this.dataModel.getAllObjects());
      const hitIds = hits.map(o => o.id);
      if (ds.additive) {
        this.selection.selectMultiple([...new Set([...ds.priorSelection, ...hitIds])]);
      } else {
        this.selection.selectMultiple(hitIds);
      }
    }
  }

  _onMouseUp(e) {
    if (!this._dragState) return;
    const ds = this._dragState;

    if (ds.type === 'rubberband') {
      this.selectionRectEl.hidden = true;
    }

    if (ds.type === 'move' && !ds.hasMoved) {
      // Was a click without drag — if clicking already-selected object without shift,
      // select only this one (deselect others)
      if (!e.shiftKey && ds.ids.length > 1) {
        const pos = this._canvasCoords(e);
        const objEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('.canvas-object');
        if (objEl) {
          this.selection.select(objEl.dataset.id);
        }
      }
    }

    this._dragState = null;
    this._updateCanvasLayout();
  }

  // ── Helpers ──

  _snap(value) {
    if (!this.snapEnabled || !this.gridSize) return value;
    return Math.round(value / this.gridSize) * this.gridSize;
  }

  _snapshotSelected() {
    const map = new Map();
    for (const id of this.selection.getSelectedIds()) {
      const obj = this.dataModel.getObject(id);
      if (obj) map.set(id, { x: obj.x, y: obj.y, w: obj.w, h: obj.h });
    }
    return map;
  }

  _computeResize(orig, dir, dx, dy) {
    let { x, y, w, h } = orig;
    const MIN = 8;

    if (dir.includes('e')) { w = Math.max(MIN, orig.w + dx); }
    if (dir.includes('w')) { w = Math.max(MIN, orig.w - dx); x = orig.x + orig.w - w; }
    if (dir.includes('s')) { h = Math.max(MIN, orig.h + dy); }
    if (dir.includes('n')) { h = Math.max(MIN, orig.h - dy); y = orig.y + orig.h - h; }

    if (this.snapEnabled) {
      w = this._snap(w) || MIN;
      h = this._snap(h) || MIN;
      x = this._snap(x);
      y = this._snap(y);
    }

    x = Math.max(0, x);
    y = Math.max(0, y);

    return { x, y, w, h };
  }

  _updateRubberBand(start, end) {
    const rect = this._normalizeRect(start, end);
    this.selectionRectEl.style.left = rect.x + 'px';
    this.selectionRectEl.style.top = rect.y + 'px';
    this.selectionRectEl.style.width = rect.w + 'px';
    this.selectionRectEl.style.height = rect.h + 'px';
  }

  _normalizeRect(p1, p2) {
    return {
      x: Math.min(p1.x, p2.x),
      y: Math.min(p1.y, p2.y),
      w: Math.abs(p2.x - p1.x),
      h: Math.abs(p2.y - p1.y),
    };
  }

  getElementForObject(id) {
    return this._elements.get(id);
  }
}
