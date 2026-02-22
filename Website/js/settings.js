const STORAGE_KEY = 'qsys-layout-editor-settings';

const DEFAULTS = {
  defaultUserPin: true,
  defaultPinStyle: 'Both',
  autoAddLabel: false,
  gridSize: 10,
  snapToGrid: true,
  showGrid: true,
  canvasWidth: 400,
  canvasHeight: 300,
  alignmentAnchor: 'first',
};

export class Settings {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this._values = { ...DEFAULTS };
    this._load();
  }

  get(key) {
    return this._values[key];
  }

  set(key, value) {
    this._values[key] = value;
    this._save();
    this.eventBus.emit('settings:changed', { key, value });
  }

  getAll() {
    return { ...this._values };
  }

  setAll(values) {
    Object.assign(this._values, values);
    this._save();
    this.eventBus.emit('settings:changed', { key: null, value: null });
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._values));
    } catch (e) {
      // localStorage unavailable (e.g. file:// in some browsers) — silently ignore
    }
  }

  _load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.assign(this._values, parsed);
      }
    } catch (e) {
      // ignore
    }
  }
}
