import { generateId, syncIdCounter, deepClone } from './utils.js';
import { CONTROL_DEFAULTS, GRAPHIC_DEFAULTS } from './schema.js';

export class DataModel {
  constructor(eventBus, settings) {
    this.eventBus = eventBus;
    this.settings = settings;
    this.objects = [];
    this._nameCounters = {};
    this.pluginInfo = null; // null means not configured
    this.pins = []; // GetPins entries: { Name, Direction, Domain }
    this.designProperties = []; // GetProperties entries
    this.undoManager = null;
    this._restoring = false;

    // Page support
    const defaultPage = {
      id: generateId(),
      name: 'Page 1',
      canvasWidth: 400,
      canvasHeight: 300,
    };
    this.pages = [defaultPage];
    this.currentPageId = defaultPage.id;
  }

  _saveUndo() {
    if (!this._restoring && this.undoManager) {
      this.undoManager.save();
    }
  }

  restoreState(state) {
    this._restoring = true;
    this.fromJSON(state);
    this._restoring = false;
  }

  // ── Canvas size delegates to current page ──

  get canvasWidth() {
    const page = this.getCurrentPage();
    return page ? page.canvasWidth : 400;
  }

  set canvasWidth(v) {
    const page = this.getCurrentPage();
    if (page) page.canvasWidth = v;
  }

  get canvasHeight() {
    const page = this.getCurrentPage();
    return page ? page.canvasHeight : 300;
  }

  set canvasHeight(v) {
    const page = this.getCurrentPage();
    if (page) page.canvasHeight = v;
  }

  // ── Page Management ──

  getPages() {
    return this.pages;
  }

  getCurrentPage() {
    return this.pages.find(p => p.id === this.currentPageId);
  }

  getCurrentPageIndex() {
    return this.pages.findIndex(p => p.id === this.currentPageId);
  }

  addPage(name) {
    this._saveUndo();
    const page = {
      id: generateId(),
      name: name || this._uniquePageName(),
      canvasWidth: this.settings ? this.settings.get('canvasWidth') : 400,
      canvasHeight: this.settings ? this.settings.get('canvasHeight') : 300,
    };
    this.pages.push(page);
    this.eventBus.emit('page:added', page);
    return page;
  }

  removePage(pageId) {
    this._saveUndo();
    if (this.pages.length <= 1) return;
    const idx = this.pages.findIndex(p => p.id === pageId);
    if (idx === -1) return;

    // Reassign objects on this page to unassigned (visible on all pages)
    const reassigned = this.objects.filter(o => o.pageId === pageId);
    for (const obj of reassigned) {
      obj.pageId = null;
    }

    const removed = this.pages.splice(idx, 1)[0];

    // If viewing the deleted page, switch to adjacent
    if (this.currentPageId === pageId) {
      const newIdx = Math.min(idx, this.pages.length - 1);
      this.currentPageId = this.pages[newIdx].id;
    }

    this.eventBus.emit('page:removed', removed);

    // Notify canvas about reassigned objects so they become visible
    if (reassigned.length > 0) {
      this.eventBus.emit('objects:bulk-updated', reassigned);
    }
  }

  renamePage(pageId, name) {
    this._saveUndo();
    const page = this.pages.find(p => p.id === pageId);
    if (!page) return;
    // Ensure uniqueness
    let finalName = name;
    if (this.pages.some(p => p.id !== pageId && p.name === finalName)) {
      let suffix = 2;
      while (this.pages.some(p => p.id !== pageId && p.name === `${name} ${suffix}`)) {
        suffix++;
      }
      finalName = `${name} ${suffix}`;
    }
    page.name = finalName;
    this.eventBus.emit('page:renamed', page);
  }

  switchPage(pageId) {
    if (pageId === this.currentPageId) return;
    const page = this.pages.find(p => p.id === pageId);
    if (!page) return;
    this.currentPageId = pageId;
    this.eventBus.emit('page:switched', page);
  }

  // ── Page-scoped Object Queries ──

  getObjectsByPage(pageId) {
    return this.objects.filter(o => o.pageId === pageId).sort((a, b) => a.zOrder - b.zOrder);
  }

  getObjectsByKindForPage(kind, pageId) {
    return this.objects.filter(o => o.kind === kind && o.pageId === pageId);
  }

  getUnassignedObjects() {
    return this.objects.filter(o => o.pageId === null).sort((a, b) => a.zOrder - b.zOrder);
  }

  getUnassignedObjectsByKind(kind) {
    return this.objects.filter(o => o.kind === kind && o.pageId === null);
  }

  getAllObjectsGlobal() {
    return [...this.objects].sort((a, b) => a.zOrder - b.zOrder);
  }

  getObjectsByKindGlobal(kind) {
    return this.objects.filter(o => o.kind === kind);
  }

  _uniquePageName() {
    const existing = new Set(this.pages.map(p => p.name));
    let n = this.pages.length + 1;
    while (existing.has(`Page ${n}`)) n++;
    return `Page ${n}`;
  }

  /** Check if a control name is already used by another control (or array group) */
  isNameTaken(name, excludeId) {
    for (const obj of this.objects) {
      if (obj.kind !== 'control') continue;
      if (obj.id === excludeId) continue;
      // For array members, skip siblings (same arrayGroup)
      if (excludeId) {
        const excludeObj = this.getObject(excludeId);
        if (excludeObj && excludeObj.arrayGroup && obj.arrayGroup === excludeObj.arrayGroup) continue;
      }
      if (obj.controlDef.Name === name) return true;
    }
    return false;
  }

  // ── Name Generation ──

  _uniqueName(baseName) {
    if (!this._nameCounters[baseName]) {
      this._nameCounters[baseName] = 0;
    }
    this._nameCounters[baseName]++;
    const count = this._nameCounters[baseName];
    return count === 1 ? baseName : `${baseName}${count}`;
  }

  // ── Object CRUD ──

  createControlObject(controlType, x, y) {
    this._saveUndo();
    const defaults = CONTROL_DEFAULTS[controlType];
    if (!defaults) return null;
    const name = this._uniqueName(defaults.controlDef.Name);
    const obj = {
      id: generateId(),
      kind: 'control',
      pageId: this.currentPageId,
      x, y,
      w: defaults.w,
      h: defaults.h,
      zOrder: this.objects.length,
      controlDef: { ...deepClone(defaults.controlDef), Name: name },
      layoutProps: deepClone(defaults.layoutProps),
    };
    // Apply settings for UserPin defaults
    if (this.settings) {
      obj.controlDef.UserPin = this.settings.get('defaultUserPin');
      obj.controlDef.PinStyle = this.settings.get('defaultPinStyle');
    }
    this.objects.push(obj);
    this.eventBus.emit('object:added', obj);
    return obj;
  }

  createGraphicObject(graphicType, x, y) {
    this._saveUndo();
    const defaults = GRAPHIC_DEFAULTS[graphicType];
    if (!defaults) return null;
    const obj = {
      id: generateId(),
      kind: 'graphic',
      pageId: this.currentPageId,
      x, y,
      w: defaults.w,
      h: defaults.h,
      zOrder: this.objects.length,
      graphicProps: deepClone(defaults.graphicProps),
    };
    this.objects.push(obj);
    this.eventBus.emit('object:added', obj);
    return obj;
  }

  addObject(obj) {
    this._saveUndo();
    this.objects.push(obj);
    this.eventBus.emit('object:added', obj);
  }

  removeObject(id) {
    this._saveUndo();
    const idx = this.objects.findIndex(o => o.id === id);
    if (idx === -1) return;
    const removed = this.objects.splice(idx, 1)[0];
    this.eventBus.emit('object:removed', removed);
  }

  removeObjects(ids) {
    this._saveUndo();
    const idSet = new Set(ids);
    const removed = this.objects.filter(o => idSet.has(o.id));
    this.objects = this.objects.filter(o => !idSet.has(o.id));
    for (const obj of removed) {
      this.eventBus.emit('object:removed', obj);
    }

    // Check for orphaned array groups — renumber or convert to standalone
    const affectedGroups = new Set(
      removed.filter(o => o.arrayGroup).map(o => o.arrayGroup)
    );
    for (const groupId of affectedGroups) {
      const remaining = this.getArrayGroup(groupId);
      if (remaining.length === 1) {
        // Convert last member to standalone
        remaining[0].arrayGroup = null;
        remaining[0].arrayIndex = null;
        this.eventBus.emit('object:updated', remaining[0]);
      } else if (remaining.length > 1) {
        // Renumber
        remaining.forEach((m, i) => { m.arrayIndex = i + 1; });
        this.eventBus.emit('objects:bulk-updated', remaining);
      }
    }
  }

  updateObject(id, changes) {
    this._saveUndo();
    const obj = this.getObject(id);
    if (!obj) return;
    for (const [key, value] of Object.entries(changes)) {
      if (key === 'controlDef' || key === 'layoutProps' || key === 'graphicProps') {
        if (obj[key]) {
          Object.assign(obj[key], value);
        }
      } else {
        obj[key] = value;
      }
    }
    this.eventBus.emit('object:updated', obj);
  }

  updateMultiple(updates) {
    this._saveUndo();
    const changed = [];
    for (const { id, changes } of updates) {
      const obj = this.getObject(id);
      if (!obj) continue;
      for (const [key, value] of Object.entries(changes)) {
        if (key === 'controlDef' || key === 'layoutProps' || key === 'graphicProps') {
          if (obj[key]) Object.assign(obj[key], value);
        } else {
          obj[key] = value;
        }
      }
      changed.push(obj);
    }
    this.eventBus.emit('objects:bulk-updated', changed);
  }

  getObject(id) {
    return this.objects.find(o => o.id === id) || null;
  }

  getAllObjects() {
    return this.objects
      .filter(o => o.pageId === this.currentPageId || o.pageId === null)
      .sort((a, b) => a.zOrder - b.zOrder);
  }

  getObjectsByKind(kind) {
    return this.objects.filter(o => o.kind === kind && (o.pageId === this.currentPageId || o.pageId === null));
  }

  getVisibleBoundingBox() {
    const objs = this.getAllObjects();
    if (objs.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
    let maxRight = 0;
    let maxBottom = 0;
    for (const o of objs) {
      const right = o.x + o.w;
      const bottom = o.y + o.h;
      if (right > maxRight) maxRight = right;
      if (bottom > maxBottom) maxBottom = bottom;
    }
    return { x: 0, y: 0, w: maxRight, h: maxBottom };
  }

  // ── Array Group Helpers ──

  getArrayGroup(groupId) {
    return this.objects
      .filter(o => o.arrayGroup === groupId)
      .sort((a, b) => a.arrayIndex - b.arrayIndex);
  }

  isArrayMember(obj) {
    return !!obj.arrayGroup;
  }

  getEffectiveCount(obj) {
    if (!obj.arrayGroup) return 1;
    return this.getArrayGroup(obj.arrayGroup).length;
  }

  expandToArray(id, count) {
    this._saveUndo();
    if (this.undoManager) this.undoManager.beginBatch();
    const obj = this.getObject(id);
    if (!obj || obj.kind !== 'control') {
      if (this.undoManager) this.undoManager.endBatch();
      return;
    }

    const currentMembers = obj.arrayGroup
      ? this.getArrayGroup(obj.arrayGroup)
      : [obj];
    const currentCount = currentMembers.length;

    if (count === currentCount || count < 1) {
      if (this.undoManager) this.undoManager.endBatch();
      return;
    }

    if (count === 1 && currentCount > 1) {
      // Contract to standalone: keep first, remove rest
      const keep = currentMembers[0];
      const removeIds = currentMembers.slice(1).map(m => m.id);
      // Remove without triggering orphan cleanup (we handle it here)
      const removeSet = new Set(removeIds);
      const removed = this.objects.filter(o => removeSet.has(o.id));
      this.objects = this.objects.filter(o => !removeSet.has(o.id));
      for (const r of removed) this.eventBus.emit('object:removed', r);
      keep.arrayGroup = null;
      keep.arrayIndex = null;
      delete keep.controlDef.Count;
      this.eventBus.emit('object:updated', keep);
      if (this.undoManager) this.undoManager.endBatch();
      return;
    }

    // Assign group ID if not already an array
    const groupId = obj.arrayGroup || generateId();
    if (!obj.arrayGroup) {
      obj.arrayGroup = groupId;
      obj.arrayIndex = 1;
      delete obj.controlDef.Count;
      this.eventBus.emit('object:updated', obj);
    }

    if (count > currentCount) {
      // Expand: add new members after the last one
      const lastMember = currentMembers[currentMembers.length - 1];
      const spacing = lastMember.h + 4;
      for (let i = currentCount + 1; i <= count; i++) {
        const newObj = {
          id: generateId(),
          kind: 'control',
          pageId: obj.pageId,
          x: lastMember.x,
          y: lastMember.y + spacing * (i - currentCount),
          w: lastMember.w,
          h: lastMember.h,
          zOrder: this.objects.length,
          arrayGroup: groupId,
          arrayIndex: i,
          controlDef: deepClone(lastMember.controlDef),
          layoutProps: deepClone(lastMember.layoutProps),
        };
        delete newObj.controlDef.Count;
        this.objects.push(newObj);
        this.eventBus.emit('object:added', newObj);
      }
    } else {
      // Contract: remove members from the end
      const removeIds = currentMembers.slice(count).map(m => m.id);
      const removeSet = new Set(removeIds);
      const removed = this.objects.filter(o => removeSet.has(o.id));
      this.objects = this.objects.filter(o => !removeSet.has(o.id));
      for (const r of removed) this.eventBus.emit('object:removed', r);
    }
    if (this.undoManager) this.undoManager.endBatch();
  }

  propagateControlDef(id, changes) {
    if (this.undoManager) this.undoManager.beginBatch();
    const obj = this.getObject(id);
    if (!obj) {
      if (this.undoManager) this.undoManager.endBatch();
      return;
    }

    if (!obj.arrayGroup) {
      // Standalone — just update normally
      this.updateObject(id, { controlDef: changes });
      if (this.undoManager) this.undoManager.endBatch();
      return;
    }

    // Propagate to all members of the group
    const members = this.getArrayGroup(obj.arrayGroup);
    const updates = members.map(m => ({
      id: m.id,
      changes: { controlDef: changes },
    }));
    this.updateMultiple(updates);
    if (this.undoManager) this.undoManager.endBatch();
  }

  duplicateObjects(ids, offsetX = 20, offsetY = 20) {
    this._saveUndo();
    const dupes = [];
    for (const id of ids) {
      const orig = this.getObject(id);
      if (!orig) continue;
      const dupe = deepClone(orig);
      dupe.id = generateId();
      dupe.pageId = this.currentPageId;
      dupe.x += offsetX;
      dupe.y += offsetY;
      dupe.zOrder = this.objects.length;
      // Duplicated array members become standalone
      dupe.arrayGroup = null;
      dupe.arrayIndex = null;
      if (dupe.kind === 'control') {
        dupe.controlDef.Name = this._uniqueName(orig.controlDef.Name);
      }
      this.objects.push(dupe);
      this.eventBus.emit('object:added', dupe);
      dupes.push(dupe);
    }
    return dupes;
  }

  bringToFront(ids) {
    if (this.undoManager) this.undoManager.beginBatch();
    const idSet = new Set(ids);
    const visible = this.getAllObjects(); // sorted by zOrder
    const rest = visible.filter(o => !idSet.has(o.id));
    const target = visible.filter(o => idSet.has(o.id));
    const reordered = [...rest, ...target];
    const updates = reordered.map((o, i) => ({ id: o.id, changes: { zOrder: i } }));
    this.updateMultiple(updates);
    if (this.undoManager) this.undoManager.endBatch();
  }

  sendToBack(ids) {
    if (this.undoManager) this.undoManager.beginBatch();
    const idSet = new Set(ids);
    const visible = this.getAllObjects(); // sorted by zOrder
    const target = visible.filter(o => idSet.has(o.id));
    const rest = visible.filter(o => !idSet.has(o.id));
    const reordered = [...target, ...rest];
    const updates = reordered.map((o, i) => ({ id: o.id, changes: { zOrder: i } }));
    this.updateMultiple(updates);
    if (this.undoManager) this.undoManager.endBatch();
  }

  setCanvasSize(w, h) {
    this._saveUndo();
    const page = this.getCurrentPage();
    if (page) {
      page.canvasWidth = w;
      page.canvasHeight = h;
    }
    this.eventBus.emit('canvas:resized', { w, h });
  }

  setPluginInfo(info) {
    this._saveUndo();
    this.pluginInfo = info ? deepClone(info) : null;
    this.eventBus.emit('pluginInfo:changed', this.pluginInfo);
  }

  getPluginInfo() {
    return this.pluginInfo ? deepClone(this.pluginInfo) : null;
  }

  setPins(pins) {
    this._saveUndo();
    this.pins = deepClone(pins || []);
    this.eventBus.emit('pins:changed', this.pins);
  }

  getPins() {
    return deepClone(this.pins);
  }

  setDesignProperties(props) {
    this._saveUndo();
    this.designProperties = deepClone(props || []);
    this.eventBus.emit('designProperties:changed', this.designProperties);
  }

  getDesignProperties() {
    return deepClone(this.designProperties);
  }

  toJSON() {
    return {
      pages: deepClone(this.pages),
      currentPageId: this.currentPageId,
      objects: deepClone(this.objects),
      pluginInfo: this.pluginInfo ? deepClone(this.pluginInfo) : null,
      pins: deepClone(this.pins),
      designProperties: deepClone(this.designProperties),
    };
  }

  fromJSON(json) {
    if (this.undoManager && !this._restoring) this.undoManager.clear();
    this.pages = json.pages || [{ id: generateId(), name: 'Page 1', canvasWidth: 400, canvasHeight: 300 }];
    this.currentPageId = json.currentPageId || this.pages[0].id;
    this.objects = json.objects || [];
    this.pluginInfo = json.pluginInfo || null;
    this.pins = json.pins || [];
    this.designProperties = json.designProperties || [];

    // Sync ID counter past all existing IDs (pages, objects, arrayGroups)
    const allIds = [
      ...this.pages.map(p => p.id),
      ...this.objects.map(o => o.id),
      ...this.objects.filter(o => o.arrayGroup).map(o => o.arrayGroup),
    ];
    syncIdCounter(allIds);

    // Rebuild name counters from ALL objects globally
    this._nameCounters = {};
    for (const obj of this.objects) {
      if (obj.kind === 'control') {
        const base = obj.controlDef.Name.replace(/\d+$/, '');
        const numMatch = obj.controlDef.Name.match(/(\d+)$/);
        const num = numMatch ? parseInt(numMatch[1]) : 1;
        this._nameCounters[base] = Math.max(this._nameCounters[base] || 0, num);
      }
    }

    // Migrate old-format array controls (single object with Count > 1, no arrayGroup)
    const toExpand = [];
    for (const obj of this.objects) {
      if (obj.kind === 'control' && !obj.arrayGroup && obj.controlDef.Count > 1) {
        toExpand.push({ id: obj.id, count: obj.controlDef.Count });
      }
    }
    for (const { id, count } of toExpand) {
      this.expandToArray(id, count);
    }

    this.eventBus.emit('model:loaded', this.toJSON());
  }

  clear() {
    this.objects = [];
    this._nameCounters = {};
    this.pluginInfo = null;
    this.pins = [];
    this.designProperties = [];
    const defaultPage = {
      id: generateId(),
      name: 'Page 1',
      canvasWidth: this.settings ? this.settings.get('canvasWidth') : 400,
      canvasHeight: this.settings ? this.settings.get('canvasHeight') : 300,
    };
    this.pages = [defaultPage];
    this.currentPageId = defaultPage.id;
    if (this.undoManager) this.undoManager.clear();
    this.eventBus.emit('model:loaded', this.toJSON());
  }
}
