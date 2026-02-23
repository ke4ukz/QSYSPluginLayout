export class Toolbox {
  constructor(dataModel, canvasManager, eventBus, settings) {
    this.dataModel = dataModel;
    this.canvasManager = canvasManager;
    this.eventBus = eventBus;
    this.settings = settings;

    this._bindDragEvents();
    this._bindClickEvents();
  }

  _createObject(kind, type, x, y) {
    let obj;
    if (kind === 'control') {
      obj = this.dataModel.createControlObject(type, x, y);

      // Auto-add a label to the left of the control
      if (obj && this.settings.get('autoAddLabel')) {
        const labelW = 80;
        const gap = 4;
        const labelH = obj.h;
        const labelX = x - labelW - gap;
        const labelY = y;
        const lbl = this.dataModel.createGraphicObject('Label', labelX, labelY);
        if (lbl) {
          this.dataModel.updateObject(lbl.id, {
            w: labelW, h: labelH,
            graphicProps: { Text: obj.controlDef.Name, HTextAlign: 'Right' },
          });
        }
      }
    } else if (kind === 'graphic') {
      obj = this.dataModel.createGraphicObject(type, x, y);
    }

    if (obj) {
      this.eventBus.emit('toolbox:object-created', obj);
    }
    return obj;
  }

  _bindClickEvents() {
    const items = document.querySelectorAll('.toolbox-item');
    for (const item of items) {
      item.addEventListener('click', e => {
        if (!e.shiftKey) return;
        const kind = item.dataset.objectKind;
        const type = item.dataset.type;
        if (!kind || !type) return;

        // Place at center of canvas
        const cw = this.dataModel.canvasWidth || 400;
        const ch = this.dataModel.canvasHeight || 300;
        let x = Math.round(cw / 2);
        let y = Math.round(ch / 2);

        if (this.canvasManager.snapEnabled && this.canvasManager.gridSize) {
          const gs = this.canvasManager.gridSize;
          x = Math.round(x / gs) * gs;
          y = Math.round(y / gs) * gs;
        }

        this._createObject(kind, type, x, y);
      });
    }
  }

  _bindDragEvents() {
    const items = document.querySelectorAll('.toolbox-item');
    const canvasEl = document.getElementById('canvas');

    for (const item of items) {
      item.addEventListener('dragstart', e => {
        e.dataTransfer.setData('application/qsys-kind', item.dataset.objectKind);
        e.dataTransfer.setData('application/qsys-type', item.dataset.type);
        e.dataTransfer.effectAllowed = 'copy';
      });
    }

    canvasEl.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    canvasEl.addEventListener('drop', e => {
      e.preventDefault();
      const kind = e.dataTransfer.getData('application/qsys-kind');
      const type = e.dataTransfer.getData('application/qsys-type');
      if (!kind || !type) return;

      const rect = canvasEl.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;

      // Snap to grid if enabled
      if (this.canvasManager.snapEnabled && this.canvasManager.gridSize) {
        const gs = this.canvasManager.gridSize;
        x = Math.round(x / gs) * gs;
        y = Math.round(y / gs) * gs;
      }

      this._createObject(kind, type, x, y);
    });
  }
}
