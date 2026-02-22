import { rectsOverlap } from './utils.js';

export class SelectionManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this._selected = new Set();
  }

  getSelectedIds() {
    return [...this._selected];
  }

  isSelected(id) {
    return this._selected.has(id);
  }

  count() {
    return this._selected.size;
  }

  select(id) {
    this._selected.clear();
    this._selected.add(id);
    this.eventBus.emit('selection:changed', this.getSelectedIds());
  }

  addToSelection(id) {
    this._selected.add(id);
    this.eventBus.emit('selection:changed', this.getSelectedIds());
  }

  removeFromSelection(id) {
    this._selected.delete(id);
    this.eventBus.emit('selection:changed', this.getSelectedIds());
  }

  toggleSelection(id) {
    if (this._selected.has(id)) {
      this._selected.delete(id);
    } else {
      this._selected.add(id);
    }
    this.eventBus.emit('selection:changed', this.getSelectedIds());
  }

  selectMultiple(ids) {
    this._selected.clear();
    for (const id of ids) {
      this._selected.add(id);
    }
    this.eventBus.emit('selection:changed', this.getSelectedIds());
  }

  selectAll(ids) {
    for (const id of ids) {
      this._selected.add(id);
    }
    this.eventBus.emit('selection:changed', this.getSelectedIds());
  }

  clearSelection() {
    if (this._selected.size === 0) return;
    this._selected.clear();
    this.eventBus.emit('selection:changed', this.getSelectedIds());
  }

  /** Find objects within a rubber band rectangle */
  getObjectsInRect(rect, allObjects) {
    return allObjects.filter(obj => rectsOverlap(rect, { x: obj.x, y: obj.y, w: obj.w, h: obj.h }));
  }

  /** Handle removal of objects from model */
  handleObjectRemoved(id) {
    if (this._selected.has(id)) {
      this._selected.delete(id);
      this.eventBus.emit('selection:changed', this.getSelectedIds());
    }
  }
}
