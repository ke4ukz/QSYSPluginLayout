export class PageTabs {
  constructor(dataModel, selectionManager, eventBus) {
    this.dataModel = dataModel;
    this.selection = selectionManager;
    this.eventBus = eventBus;

    this._createContainer();
    this._render();
    this._bindEvents();
  }

  _createContainer() {
    const canvasContainer = document.getElementById('canvas-container');
    this.tabBar = document.createElement('div');
    this.tabBar.id = 'page-tabs';
    canvasContainer.prepend(this.tabBar);
  }

  _bindEvents() {
    this.eventBus.on('page:added', () => this._render());
    this.eventBus.on('page:removed', () => this._render());
    this.eventBus.on('page:renamed', () => this._render());
    this.eventBus.on('page:switched', () => this._render());
    this.eventBus.on('model:loaded', () => this._render());
  }

  _render() {
    this.tabBar.innerHTML = '';
    const pages = this.dataModel.getPages();
    const currentId = this.dataModel.currentPageId;

    for (const page of pages) {
      const tab = document.createElement('div');
      tab.className = 'page-tab' + (page.id === currentId ? ' active' : '');
      tab.dataset.pageId = page.id;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'page-tab-name';
      nameSpan.textContent = page.name;
      tab.appendChild(nameSpan);

      // Close button (only if more than 1 page)
      if (pages.length > 1) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'page-tab-close';
        closeBtn.textContent = '\u00D7';
        closeBtn.title = 'Remove page';
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Delete page "${page.name}"? Its objects will become visible on all pages.`)) {
            this.selection.clearSelection();
            this.dataModel.removePage(page.id);
          }
        });
        tab.appendChild(closeBtn);
      }

      // Click to switch
      tab.addEventListener('click', () => {
        if (page.id !== this.dataModel.currentPageId) {
          this.selection.clearSelection();
          this.dataModel.switchPage(page.id);
        }
      });

      // Double-click to rename
      tab.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this._startInlineRename(tab, page);
      });

      this.tabBar.appendChild(tab);
    }

    // "+" add page button
    const addBtn = document.createElement('button');
    addBtn.className = 'page-tab-add';
    addBtn.textContent = '+';
    addBtn.title = 'Add page';
    addBtn.addEventListener('click', () => {
      const newPage = this.dataModel.addPage();
      this.selection.clearSelection();
      this.dataModel.switchPage(newPage.id);
    });
    this.tabBar.appendChild(addBtn);
  }

  _startInlineRename(tabEl, page) {
    const nameSpan = tabEl.querySelector('.page-tab-name');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'page-tab-rename-input';
    input.value = page.name;

    const commit = () => {
      const newName = input.value.trim();
      if (newName && newName !== page.name) {
        this.dataModel.renamePage(page.id, newName);
      } else {
        this._render();
      }
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { input.blur(); }
      if (e.key === 'Escape') {
        input.value = page.name;
        input.blur();
      }
      e.stopPropagation(); // prevent keyboard shortcuts while renaming
    });

    nameSpan.replaceWith(input);
    input.focus();
    input.select();
  }
}
