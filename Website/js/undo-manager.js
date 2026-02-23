export class UndoManager {
  constructor(dataModel, maxHistory = 50) {
    this.dataModel = dataModel;
    this.maxHistory = maxHistory;
    this._undoStack = [];
    this._redoStack = [];
    this._batching = false;
    this._batchSaved = false;
  }

  _snapshot() {
    return this.dataModel.toJSON();
  }

  /** Save current state before a mutation. Call this before changing data. */
  save() {
    if (this._batching) {
      if (!this._batchSaved) {
        this._pushUndo();
        this._batchSaved = true;
      }
      return;
    }
    this._pushUndo();
  }

  _pushUndo() {
    this._undoStack.push(this._snapshot());
    if (this._undoStack.length > this.maxHistory) {
      this._undoStack.shift();
    }
    this._redoStack = [];
  }

  /** Begin a batch — only the first save() in a batch records a snapshot. */
  beginBatch() {
    if (!this._batching) {
      this._batching = true;
      this._batchSaved = false;
    }
  }

  /** End the current batch. */
  endBatch() {
    this._batching = false;
    this._batchSaved = false;
  }

  undo() {
    if (this._undoStack.length === 0) return;
    this._redoStack.push(this._snapshot());
    const state = this._undoStack.pop();
    this.dataModel.restoreState(state);
  }

  redo() {
    if (this._redoStack.length === 0) return;
    this._undoStack.push(this._snapshot());
    const state = this._redoStack.pop();
    this.dataModel.restoreState(state);
  }

  get canUndo() { return this._undoStack.length > 0; }
  get canRedo() { return this._redoStack.length > 0; }

  clear() {
    this._undoStack = [];
    this._redoStack = [];
  }
}
