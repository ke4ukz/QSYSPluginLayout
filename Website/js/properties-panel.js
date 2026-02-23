import {
  CONTROL_TYPES, BUTTON_TYPES, INDICATOR_TYPES, CONTROL_UNITS, PIN_STYLES,
  LAYOUT_STYLES, BUTTON_STYLES, BUTTON_VISUAL_STYLES, METER_STYLES, TEXTBOX_STYLES,
  H_TEXT_ALIGNS, V_TEXT_ALIGNS, GRAPHIC_TYPES, QSYS_FONTS, FONT_STYLES,
  STYLES_FOR_CONTROL_TYPE,
} from './schema.js';
import { rgbToHex, hexToRGB } from './utils.js';

export class PropertiesPanel {
  constructor(dataModel, selectionManager, eventBus) {
    this.dataModel = dataModel;
    this.selection = selectionManager;
    this.eventBus = eventBus;
    this.contentEl = document.getElementById('properties-content');
    this._suppressUpdate = false;

    this.eventBus.on('selection:changed', () => this._rebuild());
    this.eventBus.on('object:updated', obj => {
      if (!this._suppressUpdate && this.selection.isSelected(obj.id)) {
        this._rebuild();
      }
    });
    this.eventBus.on('objects:bulk-updated', objs => {
      if (!this._suppressUpdate && objs.some(o => this.selection.isSelected(o.id))) {
        this._rebuild();
      }
    });
  }

  _rebuild() {
    const ids = this.selection.getSelectedIds();
    this.contentEl.innerHTML = '';

    if (ids.length === 0) {
      this.contentEl.innerHTML = '<p class="placeholder-text">Select an object to edit its properties.</p>';
      return;
    }

    if (ids.length > 1) {
      this._buildMultiSelect(ids);
      return;
    }

    const obj = this.dataModel.getObject(ids[0]);
    if (!obj) return;

    if (obj.kind === 'control') {
      this._buildControlProps(obj);
    } else {
      this._buildGraphicProps(obj);
    }
  }

  // ── Control Properties ──

  _buildControlProps(obj) {
    const cd = obj.controlDef;
    const lp = obj.layoutProps;
    const isArray = this.dataModel.isArrayMember(obj);
    const effectiveCount = this.dataModel.getEffectiveCount(obj);

    // Choose updater: array members propagate controlDef to all siblings
    const updateCD = isArray
      ? (id, changes) => this._propagateControlDef(id, changes)
      : (id, changes) => this._updateControlDef(id, changes);

    // Identity section
    this._section('Identity');
    if (isArray) {
      this._readonlyRow('Array', `${cd.Name} [${obj.arrayIndex} of ${effectiveCount}]`);
    }
    this._textRow('Name', cd.Name, v => {
      const trimmed = v.trim();
      if (!trimmed) return;
      if (this.dataModel.isNameTaken(trimmed, obj.id)) {
        alert(`Control name "${trimmed}" is already in use.`);
        this._rebuild();
        return;
      }
      updateCD(obj.id, { Name: trimmed });
    });
    this._readonlyRow('ControlType', cd.ControlType);

    // Select All in Array button
    if (isArray) {
      const btnRow = document.createElement('div');
      btnRow.className = 'props-row';
      const btn = document.createElement('button');
      btn.textContent = 'Select All in Array';
      btn.style.cssText = 'flex:1; padding:3px 6px; font-size:10px;';
      btn.addEventListener('click', () => {
        const members = this.dataModel.getArrayGroup(obj.arrayGroup);
        this.selection.selectMultiple(members.map(m => m.id));
      });
      btnRow.appendChild(btn);
      this.contentEl.appendChild(btnRow);
    }

    // Page assignment
    this._pageRow(obj);

    // Position & Size
    this._section('Position & Size');
    this._numberRow('X', obj.x, v => this._updateTop(obj.id, { x: Math.max(0, v) }));
    this._numberRow('Y', obj.y, v => this._updateTop(obj.id, { y: Math.max(0, v) }));
    this._numberRow('Width', obj.w, v => this._updateTop(obj.id, { w: Math.max(8, v) }));
    this._numberRow('Height', obj.h, v => this._updateTop(obj.id, { h: Math.max(8, v) }));

    // Control Definition
    this._section('Control Definition');
    if (cd.ControlType === 'Button') {
      this._selectRow('ButtonType', cd.ButtonType, BUTTON_TYPES, v => updateCD(obj.id, { ButtonType: v }));
    }
    if (cd.ControlType === 'Knob') {
      this._selectRow('ControlUnit', cd.ControlUnit, CONTROL_UNITS, v => updateCD(obj.id, { ControlUnit: v }));
      this._numberRow('Min', cd.Min, v => updateCD(obj.id, { Min: v }));
      this._numberRow('Max', cd.Max, v => updateCD(obj.id, { Max: v }));
    }
    if (cd.ControlType === 'Indicator') {
      this._selectRow('IndicatorType', cd.IndicatorType, INDICATOR_TYPES, v => updateCD(obj.id, { IndicatorType: v }));
    }
    this._numberRow('Count', effectiveCount, v => {
      const newCount = Math.max(1, Math.round(v)) || 1;
      if (newCount === effectiveCount) return;
      this._suppressUpdate = true;
      this.dataModel.expandToArray(obj.id, newCount);
      this._suppressUpdate = false;
      this._rebuild();
    });
    this._checkboxRow('UserPin', cd.UserPin, v => updateCD(obj.id, { UserPin: v }));
    if (cd.UserPin) {
      this._selectRow('PinStyle', cd.PinStyle || 'Both', PIN_STYLES, v => updateCD(obj.id, { PinStyle: v }));
    }

    // Layout Style
    this._section('Layout Style');
    const validStyles = STYLES_FOR_CONTROL_TYPE[cd.ControlType] || LAYOUT_STYLES;
    this._selectRow('Style', lp.Style, validStyles, v => {
      this._updateLayoutProps(obj.id, { Style: v });
      this._rebuild();
    });
    this._textRow('PrettyName', lp.PrettyName || '', v => this._updateLayoutProps(obj.id, { PrettyName: v || undefined }), 'Group~Name');
    this._colorRow('Color', lp.Color, v => this._updateLayoutProps(obj.id, { Color: v }));
    this._colorRow('TextColor', lp.TextColor, v => this._updateLayoutProps(obj.id, { TextColor: v }));

    // Font
    this._section('Font');
    this._selectRow('Font', lp.Font || 'Roboto', QSYS_FONTS, v => this._updateLayoutProps(obj.id, { Font: v }));
    const fontStyles = FONT_STYLES[lp.Font || 'Roboto'] || ['Regular'];
    this._selectRow('FontStyle', lp.FontStyle || 'Regular', fontStyles, v => this._updateLayoutProps(obj.id, { FontStyle: v }));
    this._numberRow('FontSize', lp.FontSize || 12, v => this._updateLayoutProps(obj.id, { FontSize: v }));
    this._selectRow('HTextAlign', lp.HTextAlign || 'Center', H_TEXT_ALIGNS, v => this._updateLayoutProps(obj.id, { HTextAlign: v }));
    this._selectRow('VTextAlign', lp.VTextAlign || 'Center', V_TEXT_ALIGNS, v => this._updateLayoutProps(obj.id, { VTextAlign: v }));

    // Style-specific
    if (lp.Style === 'Button') {
      this._section('Button Style');
      this._selectRow('ButtonStyle', lp.ButtonStyle || 'Momentary', BUTTON_STYLES, v => this._updateLayoutProps(obj.id, { ButtonStyle: v }));
      this._selectRow('VisualStyle', lp.ButtonVisualStyle || 'Gloss', BUTTON_VISUAL_STYLES, v => this._updateLayoutProps(obj.id, { ButtonVisualStyle: v }));
      this._textRow('Legend', lp.Legend || '', v => this._updateLayoutProps(obj.id, { Legend: v || undefined }));
      this._numberRow('CornerRadius', lp.CornerRadius || 0, v => this._updateLayoutProps(obj.id, { CornerRadius: v }));
      this._checkboxRow('UnlinkOffColor', lp.UnlinkOffColor || false, v => this._updateLayoutProps(obj.id, { UnlinkOffColor: v }));
      if (lp.UnlinkOffColor) {
        this._colorRow('OffColor', lp.OffColor, v => this._updateLayoutProps(obj.id, { OffColor: v }));
      }
    }

    if (lp.Style === 'Fader') {
      this._section('Fader Style');
      this._checkboxRow('ShowTextbox', lp.ShowTextbox || false, v => this._updateLayoutProps(obj.id, { ShowTextbox: v }));
    }

    if (lp.Style === 'Meter') {
      this._section('Meter Style');
      this._selectRow('MeterStyle', lp.MeterStyle || 'Standard', METER_STYLES, v => this._updateLayoutProps(obj.id, { MeterStyle: v }));
      this._checkboxRow('ShowTextbox', lp.ShowTextbox !== false, v => this._updateLayoutProps(obj.id, { ShowTextbox: v }));
      this._colorRow('BgColor', lp.BackgroundColor, v => this._updateLayoutProps(obj.id, { BackgroundColor: v }));
    }

    if (lp.Style === 'Text') {
      this._section('Text Style');
      this._selectRow('TextBoxStyle', lp.TextBoxStyle || 'Normal', TEXTBOX_STYLES, v => this._updateLayoutProps(obj.id, { TextBoxStyle: v }));
      this._checkboxRow('IsReadOnly', lp.IsReadOnly || false, v => this._updateLayoutProps(obj.id, { IsReadOnly: v }));
    }

    if (lp.Style === 'ComboBox' || lp.Style === 'ListBox') {
      this._section('List Items');
      this._buildComboBoxEditor(obj);
    }

    // Advanced
    this._section('Advanced');
    this._numberRow('StrokeWidth', lp.StrokeWidth !== undefined ? lp.StrokeWidth : 1, v => this._updateLayoutProps(obj.id, { StrokeWidth: v }));
    this._colorRow('StrokeColor', lp.StrokeColor, v => this._updateLayoutProps(obj.id, { StrokeColor: v }));
    this._numberRow('Margin', lp.Margin || 0, v => this._updateLayoutProps(obj.id, { Margin: v }));
    this._numberRow('Padding', lp.Padding !== undefined ? lp.Padding : 1, v => this._updateLayoutProps(obj.id, { Padding: v }));
    this._numberRow('ZOrder', obj.zOrder || 0, v => this._updateTop(obj.id, { zOrder: v }));
  }

  // ── Graphic Properties ──

  _buildGraphicProps(obj) {
    const gp = obj.graphicProps;
    const isImage = gp.Type === 'image' || gp.Type === 'svg';

    this._section('Graphic');
    this._readonlyRow('Type', gp.Type);
    if (!isImage) {
      this._textRow('Text', gp.Text || '', v => this._updateGraphicProps(obj.id, { Text: v }));
    }

    // Image/SVG file upload
    if (isImage) {
      this._fileRow('Image', gp.Image,
        v => this._updateGraphicProps(obj.id, { Image: v }),
        gp.Type === 'svg' ? '.svg' : 'image/*'
      );
    }

    // Page assignment
    this._pageRow(obj);

    this._section('Position & Size');
    this._numberRow('X', obj.x, v => this._updateTop(obj.id, { x: Math.max(0, v) }));
    this._numberRow('Y', obj.y, v => this._updateTop(obj.id, { y: Math.max(0, v) }));
    this._numberRow('Width', obj.w, v => this._updateTop(obj.id, { w: Math.max(8, v) }));
    this._numberRow('Height', obj.h, v => this._updateTop(obj.id, { h: Math.max(8, v) }));

    if (!isImage) {
      this._section('Appearance');
      this._colorRow('Color', gp.Color, v => this._updateGraphicProps(obj.id, { Color: v }));
      if (gp.Type !== 'Header') {
        this._colorRow('Fill', gp.Fill, v => this._updateGraphicProps(obj.id, { Fill: v }));
      }
      if (gp.Type !== 'Header') {
        this._colorRow('StrokeColor', gp.StrokeColor, v => this._updateGraphicProps(obj.id, { StrokeColor: v }));
        this._numberRow('StrokeWidth', gp.StrokeWidth !== undefined ? gp.StrokeWidth : 0, v => this._updateGraphicProps(obj.id, { StrokeWidth: v }));
        this._numberRow('CornerRadius', gp.CornerRadius || 0, v => this._updateGraphicProps(obj.id, { CornerRadius: v }));
      }

      this._section('Font');
      this._selectRow('Font', gp.Font || 'Roboto', QSYS_FONTS, v => this._updateGraphicProps(obj.id, { Font: v }));
      this._numberRow('FontSize', gp.FontSize || 12, v => this._updateGraphicProps(obj.id, { FontSize: v }));
      this._checkboxRow('IsBold', gp.IsBold || false, v => this._updateGraphicProps(obj.id, { IsBold: v }));
      this._selectRow('HTextAlign', gp.HTextAlign || 'Center', H_TEXT_ALIGNS, v => this._updateGraphicProps(obj.id, { HTextAlign: v }));
      if (gp.Type === 'Label') {
        this._selectRow('VTextAlign', gp.VTextAlign || 'Center', V_TEXT_ALIGNS, v => this._updateGraphicProps(obj.id, { VTextAlign: v }));
        this._numberRow('Margin', gp.Margin || 0, v => this._updateGraphicProps(obj.id, { Margin: v }));
        this._numberRow('Padding', gp.Padding !== undefined ? gp.Padding : 1, v => this._updateGraphicProps(obj.id, { Padding: v }));
      }
    }

    this._section('Advanced');
    this._numberRow('ZOrder', obj.zOrder || 0, v => this._updateTop(obj.id, { zOrder: v }));
  }

  // ── Multi-select ──

  _buildMultiSelect(ids) {
    const objs = ids.map(id => this.dataModel.getObject(id)).filter(Boolean);
    this._section(`${objs.length} Objects Selected`);

    // Show shared position/size (with blank if mixed)
    const allX = new Set(objs.map(o => o.x));
    const allY = new Set(objs.map(o => o.y));
    const allW = new Set(objs.map(o => o.w));
    const allH = new Set(objs.map(o => o.h));

    this._numberRow('X', allX.size === 1 ? [...allX][0] : '', v => {
      if (v === '') return;
      this.dataModel.updateMultiple(ids.map(id => ({ id, changes: { x: Math.max(0, v) } })));
    });
    this._numberRow('Y', allY.size === 1 ? [...allY][0] : '', v => {
      if (v === '') return;
      this.dataModel.updateMultiple(ids.map(id => ({ id, changes: { y: Math.max(0, v) } })));
    });
    this._numberRow('Width', allW.size === 1 ? [...allW][0] : '', v => {
      if (v === '') return;
      this.dataModel.updateMultiple(ids.map(id => ({ id, changes: { w: Math.max(8, v) } })));
    });
    this._numberRow('Height', allH.size === 1 ? [...allH][0] : '', v => {
      if (v === '') return;
      this.dataModel.updateMultiple(ids.map(id => ({ id, changes: { h: Math.max(8, v) } })));
    });
  }

  // ── ComboBox / ListBox items editor ──

  _buildComboBoxEditor(obj) {
    const cd = obj.controlDef;
    const mode = cd.comboBoxMode || 'simple';
    const items = cd.comboBoxItems || [];

    // Always read fresh from data model to avoid stale closures
    const freshItems = () => this.dataModel.getObject(obj.id).controlDef.comboBoxItems || [];

    // Mode selector
    this._selectRow('ItemMode', mode, ['simple', 'keyValue'], v => {
      const current = freshItems();
      let converted;
      if (v === 'keyValue') {
        converted = current.map(item => {
          const text = typeof item === 'string' ? item : (item.text || '');
          return { text, value: '' };
        });
      } else {
        converted = current.map(item => {
          return typeof item === 'object' ? (item.text || '') : item;
        });
      }
      this._updateControlDef(obj.id, { comboBoxMode: v, comboBoxItems: converted });
      this._rebuild();
    });

    // Items list
    const container = document.createElement('div');
    container.className = 'combobox-items-list';

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = document.createElement('div');
      row.className = 'combobox-item-row';

      if (mode === 'simple') {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = typeof item === 'string' ? item : (item.text || '');
        input.placeholder = 'Item text';
        input.addEventListener('change', () => {
          const newItems = [...freshItems()];
          newItems[i] = input.value;
          this._updateControlDef(obj.id, { comboBoxItems: newItems });
        });
        row.appendChild(input);
      } else {
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = typeof item === 'object' ? (item.text || '') : item;
        textInput.placeholder = 'Display text';
        textInput.addEventListener('change', () => {
          const newItems = [...freshItems()];
          newItems[i] = { ...(typeof newItems[i] === 'object' ? newItems[i] : {}), text: textInput.value };
          this._updateControlDef(obj.id, { comboBoxItems: newItems });
        });
        row.appendChild(textInput);

        const valInput = document.createElement('input');
        valInput.type = 'text';
        valInput.value = typeof item === 'object' ? (item.value || '') : '';
        valInput.placeholder = 'Value';
        valInput.addEventListener('change', () => {
          const newItems = [...freshItems()];
          newItems[i] = { ...(typeof newItems[i] === 'object' ? newItems[i] : {}), value: valInput.value };
          this._updateControlDef(obj.id, { comboBoxItems: newItems });
        });
        row.appendChild(valInput);
      }

      // Move up
      const btnUp = document.createElement('button');
      btnUp.textContent = '\u25B2';
      btnUp.title = 'Move up';
      btnUp.disabled = i === 0;
      btnUp.addEventListener('click', () => {
        const newItems = [...freshItems()];
        [newItems[i - 1], newItems[i]] = [newItems[i], newItems[i - 1]];
        this._updateControlDef(obj.id, { comboBoxItems: newItems });
        this._rebuild();
      });
      row.appendChild(btnUp);

      // Move down
      const btnDown = document.createElement('button');
      btnDown.textContent = '\u25BC';
      btnDown.title = 'Move down';
      btnDown.disabled = i === items.length - 1;
      btnDown.addEventListener('click', () => {
        const newItems = [...freshItems()];
        [newItems[i], newItems[i + 1]] = [newItems[i + 1], newItems[i]];
        this._updateControlDef(obj.id, { comboBoxItems: newItems });
        this._rebuild();
      });
      row.appendChild(btnDown);

      // Remove
      const btnRemove = document.createElement('button');
      btnRemove.textContent = '\u2715';
      btnRemove.title = 'Remove item';
      btnRemove.addEventListener('click', () => {
        const newItems = freshItems().filter((_, idx) => idx !== i);
        this._updateControlDef(obj.id, { comboBoxItems: newItems });
        this._rebuild();
      });
      row.appendChild(btnRemove);

      container.appendChild(row);
    }

    this.contentEl.appendChild(container);

    // Add item button
    const btnAdd = document.createElement('button');
    btnAdd.className = 'combobox-add-btn';
    btnAdd.textContent = '+ Add Item';
    btnAdd.addEventListener('click', () => {
      const newItems = [...freshItems()];
      if (mode === 'simple') {
        newItems.push('');
      } else {
        newItems.push({ text: '', value: '' });
      }
      this._updateControlDef(obj.id, { comboBoxItems: newItems });
      this._rebuild();
    });
    this.contentEl.appendChild(btnAdd);
  }

  // ── Update helpers (suppress re-render loop) ──

  _propagateControlDef(id, changes) {
    this._suppressUpdate = true;
    this.dataModel.propagateControlDef(id, changes);
    this._suppressUpdate = false;
  }

  _updateTop(id, changes) {
    this._suppressUpdate = true;
    this.dataModel.updateObject(id, changes);
    this._suppressUpdate = false;
  }

  _updateControlDef(id, changes) {
    this._suppressUpdate = true;
    this.dataModel.updateObject(id, { controlDef: changes });
    this._suppressUpdate = false;
  }

  _updateLayoutProps(id, changes) {
    this._suppressUpdate = true;
    this.dataModel.updateObject(id, { layoutProps: changes });
    this._suppressUpdate = false;
  }

  _updateGraphicProps(id, changes) {
    this._suppressUpdate = true;
    this.dataModel.updateObject(id, { graphicProps: changes });
    this._suppressUpdate = false;
  }

  // ── Page assignment ──

  _pageRow(obj) {
    const pages = this.dataModel.getPages();
    const row = this._makeRow('Page');
    const select = document.createElement('select');

    // "All Pages" option (pageId = null)
    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'All Pages';
    if (obj.pageId === null) allOpt.selected = true;
    select.appendChild(allOpt);

    for (const page of pages) {
      const option = document.createElement('option');
      option.value = page.id;
      option.textContent = page.name;
      if (page.id === obj.pageId) option.selected = true;
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      const newPageId = select.value === '' ? null : select.value;
      this._updateTop(obj.id, { pageId: newPageId });
    });

    row.appendChild(select);
    this.contentEl.appendChild(row);
  }

  // ── DOM builders ──

  _section(title) {
    const header = document.createElement('div');
    header.className = 'props-section-header';
    header.textContent = title;
    this.contentEl.appendChild(header);
  }

  focusProperty(propName) {
    const input = this.contentEl.querySelector(`[data-prop="${propName}"]`);
    if (input) { input.focus(); input.select(); }
  }

  _textRow(label, value, onChange, placeholder) {
    const row = this._makeRow(label);
    const input = document.createElement('input');
    input.type = 'text';
    input.dataset.prop = label;
    input.value = value || '';
    if (placeholder) input.placeholder = placeholder;
    input.addEventListener('change', () => onChange(input.value));
    row.appendChild(input);
    this.contentEl.appendChild(row);
  }

  _numberRow(label, value, onChange) {
    const row = this._makeRow(label);
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value !== '' && value !== undefined ? value : '';
    input.addEventListener('change', () => {
      const v = input.value === '' ? '' : parseFloat(input.value);
      onChange(v);
    });
    row.appendChild(input);
    this.contentEl.appendChild(row);
  }

  _selectRow(label, value, options, onChange) {
    const row = this._makeRow(label);
    const select = document.createElement('select');
    for (const opt of options) {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (opt === value) option.selected = true;
      select.appendChild(option);
    }
    select.addEventListener('change', () => onChange(select.value));
    row.appendChild(select);
    this.contentEl.appendChild(row);
  }

  _checkboxRow(label, value, onChange) {
    const row = this._makeRow(label);
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!value;
    input.addEventListener('change', () => onChange(input.checked));
    row.appendChild(input);
    this.contentEl.appendChild(row);
  }

  _colorRow(label, value, onChange) {
    const row = this._makeRow(label);
    const input = document.createElement('input');
    input.type = 'color';
    input.value = value ? rgbToHex(value) : '#000000';
    input.addEventListener('input', () => onChange(hexToRGB(input.value)));
    row.appendChild(input);
    this.contentEl.appendChild(row);
  }

  _fileRow(label, value, onChange, accept) {
    const row = this._makeRow(label);
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex; flex-direction:column; gap:4px; flex:1; min-width:0;';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:4px; align-items:center;';

    const btn = document.createElement('button');
    btn.textContent = value ? 'Replace...' : 'Choose File...';
    btn.style.cssText = 'font-size:10px; padding:2px 6px; background:#3c3c3c; color:#ddd; border:1px solid #555; border-radius:3px; cursor:pointer;';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = accept || 'image/*';
    fileInput.hidden = true;

    btn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        onChange(base64);
      };
      reader.readAsDataURL(file);
    });

    btnRow.appendChild(btn);
    btnRow.appendChild(fileInput);

    if (value) {
      const clearBtn = document.createElement('button');
      clearBtn.textContent = 'Clear';
      clearBtn.style.cssText = 'font-size:10px; padding:2px 6px; background:#3c3c3c; color:#ddd; border:1px solid #555; border-radius:3px; cursor:pointer;';
      clearBtn.addEventListener('click', () => onChange(''));
      btnRow.appendChild(clearBtn);

      const sizeLabel = document.createElement('span');
      sizeLabel.textContent = `${Math.ceil(value.length * 0.75 / 1024)}KB`;
      sizeLabel.style.cssText = 'color:#888; font-size:10px;';
      btnRow.appendChild(sizeLabel);
    }

    wrapper.appendChild(btnRow);

    // Thumbnail preview
    if (value) {
      const preview = document.createElement('img');
      const mime = accept === '.svg' ? 'image/svg+xml' : 'image/png';
      preview.src = `data:${mime};base64,${value}`;
      preview.style.cssText = 'max-width:120px; max-height:60px; object-fit:contain; border:1px solid #444; border-radius:2px; background:#1a1a1a;';
      wrapper.appendChild(preview);
    }

    row.appendChild(wrapper);
    this.contentEl.appendChild(row);
  }

  _readonlyRow(label, value) {
    const row = this._makeRow(label);
    const span = document.createElement('span');
    span.textContent = value;
    span.style.color = '#888';
    row.appendChild(span);
    this.contentEl.appendChild(row);
  }

  _makeRow(label) {
    const row = document.createElement('div');
    row.className = 'props-row';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    row.appendChild(lbl);
    return row;
  }
}
