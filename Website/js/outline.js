const ICONS = {
  // Controls
  Button: '\u25A3',
  Knob: '\u25CE',
  Indicator: '\u25CF',
  Text: '\u25AD',
  // Graphics
  Label: 'A',
  GroupBox: '\u25A1',
  Header: '\u2501',
  image: '\u25A4',
  svg: '</>',
};

export class Outline {
  constructor(dataModel, selectionManager, eventBus) {
    this.dataModel = dataModel;
    this.selection = selectionManager;
    this.eventBus = eventBus;

    this.el = document.createElement('div');
    this.el.id = 'outline';
    const header = document.createElement('h3');
    header.textContent = 'Outline';
    this.el.appendChild(header);

    this._listEl = document.createElement('div');
    this.el.appendChild(this._listEl);

    document.getElementById('toolbox').appendChild(this.el);

    this._bindEvents();
    this._render();
  }

  _bindEvents() {
    const render = () => this._render();
    this.eventBus.on('object:added', render);
    this.eventBus.on('object:removed', render);
    this.eventBus.on('object:updated', render);
    this.eventBus.on('objects:bulk-updated', render);
    this.eventBus.on('model:loaded', render);
    this.eventBus.on('page:added', render);
    this.eventBus.on('page:removed', render);
    this.eventBus.on('page:renamed', render);
    this.eventBus.on('page:switched', render);
    this.eventBus.on('selection:changed', ids => this._updateHighlights(ids));
  }

  _render() {
    this._listEl.innerHTML = '';
    const pages = this.dataModel.getPages();

    if (pages.length <= 1) {
      // Single page — flat list
      for (const obj of this.dataModel.getAllObjects()) {
        this._listEl.appendChild(this._renderItem(obj));
      }
    } else {
      // Multi-page — group by page
      for (const page of pages) {
        const objs = this.dataModel.getObjectsByPage(page.id);
        if (objs.length === 0) continue;
        const group = document.createElement('div');
        group.className = 'outline-group';
        const hdr = document.createElement('div');
        hdr.className = 'outline-group-header';
        hdr.textContent = page.name;
        group.appendChild(hdr);
        for (const obj of objs) {
          group.appendChild(this._renderItem(obj));
        }
        this._listEl.appendChild(group);
      }

      // Unassigned ("All Pages")
      const unassigned = this.dataModel.getUnassignedObjects();
      if (unassigned.length > 0) {
        const group = document.createElement('div');
        group.className = 'outline-group';
        const hdr = document.createElement('div');
        hdr.className = 'outline-group-header';
        hdr.textContent = 'All Pages';
        group.appendChild(hdr);
        for (const obj of unassigned) {
          group.appendChild(this._renderItem(obj));
        }
        this._listEl.appendChild(group);
      }
    }

    this._updateHighlights(this.selection.getSelectedIds());
  }

  _renderItem(obj) {
    const el = document.createElement('div');
    el.className = 'outline-item';
    el.dataset.id = obj.id;

    const icon = document.createElement('span');
    icon.className = 'outline-icon';
    icon.textContent = this._getIcon(obj);
    el.appendChild(icon);

    const name = document.createElement('span');
    name.className = 'outline-name';
    name.textContent = this._getDisplayName(obj);
    el.appendChild(name);

    el.addEventListener('click', e => {
      e.stopPropagation();
      if (e.shiftKey) {
        this.selection.toggleSelection(obj.id);
      } else {
        this.selection.select(obj.id);
      }
    });

    return el;
  }

  _updateHighlights(selectedIds) {
    const idSet = new Set(selectedIds);
    for (const item of this._listEl.querySelectorAll('.outline-item')) {
      item.classList.toggle('selected', idSet.has(item.dataset.id));
    }
  }

  _getDisplayName(obj) {
    if (obj.kind === 'control') {
      return obj.controlDef.Name;
    }
    const type = obj.graphicProps.Type || 'Graphic';
    const text = obj.graphicProps.Text;
    if (text) {
      const truncated = text.length > 20 ? text.slice(0, 20) + '\u2026' : text;
      return `${type}: ${truncated}`;
    }
    return type;
  }

  _getIcon(obj) {
    if (obj.kind === 'control') {
      return ICONS[obj.controlDef.ControlType] || '\u25A3';
    }
    return ICONS[obj.graphicProps.Type] || '\u25A1';
  }
}
