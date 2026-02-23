// Find line ranges in generated Lua that correspond to a control name.
// Returns array of [startLine, endLine] pairs (0-indexed, inclusive).
export function findControlLineRanges(code, controlName) {
  const lines = code.split('\n');
  const ranges = [];
  const escaped = controlName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const commentRe = new RegExp(`^\\s*-- ${escaped}(\\s*\\(|\\s*$)`);

  for (let i = 0; i < lines.length; i++) {
    if (!commentRe.test(lines[i])) continue;

    // Found a matching comment — walk forward tracking brace depth
    let end = i;
    let braceDepth = 0;
    let foundBrace = false;

    for (let j = i + 1; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === '{') { braceDepth++; foundBrace = true; }
        if (ch === '}') braceDepth--;
      }
      end = j;

      if (foundBrace && braceDepth <= 0) {
        // Check if next line is another array member for the same control
        if (j + 1 < lines.length && lines[j + 1].trim().startsWith(`layout["${controlName} `)) {
          continue;
        }
        break;
      }
    }

    ranges.push([i, end]);
  }

  return ranges;
}

// Find line ranges in the Runtime section that reference a control by name.
// Covers EventHandler blocks, ComboBox/ListBox Choices, and handler functions.
export function findRuntimeLineRanges(code, controlName) {
  const lines = code.split('\n');
  const ranges = [];
  const safeName = controlName.replace(/[^A-Za-z0-9_]/g, '_');

  const isMatch = line =>
    line.includes(`Controls["${controlName}"]`) ||
    line.includes(`Controls["${controlName} "`) ||
    line.includes(`${safeName}_Choices`) ||
    line.includes(`${safeName}_Handler`);

  for (let i = 0; i < lines.length; i++) {
    if (!isMatch(lines[i])) continue;
    if (ranges.some(([s, e]) => i >= s && i <= e)) continue;

    // Walk up past blanks/comments to find enclosing block start
    let start = i;
    for (let k = i - 1; k >= 0; k--) {
      const kt = lines[k].trim();
      if (kt === '' || kt.startsWith('--')) continue;
      if (/^(for |function |local )/.test(kt)) start = k;
      break;
    }

    // Track depth from start to find block end
    let end = start;
    let depth = 0;
    for (let j = start; j < lines.length; j++) {
      const l = lines[j];
      depth += (l.match(/\{/g) || []).length + (l.match(/\bdo\b/g) || []).length +
               (l.match(/\bfunction\b/g) || []).length;
      depth -= (l.match(/\}/g) || []).length + (l.match(/\bend\b/g) || []).length;
      end = j;
      if (depth <= 0) break;
    }

    ranges.push([start, end]);
    i = end;
  }

  return ranges;
}

export function generateLua(dataModel, settings) {
  const pages = dataModel.getPages();
  const allControls = dataModel.getObjectsByKindGlobal('control');
  const autoStatus = settings && settings.get('autoGenerateStatus');

  let lua = '';

  // Header comments
  const pi = dataModel.getPluginInfo();
  const authorName = settings && settings.get('authorName');
  const pluginName = pi && pi.Name;
  if (pluginName || authorName) {
    lua += generateHeaderComments(pluginName, authorName);
    lua += '\n\n';
  }

  // PluginInfo
  if (pi) {
    lua += generatePluginInfo(pi);
    lua += '\n\n';
  }

  // GetPages (only if 2+ pages)
  if (pages.length > 1) {
    lua += generateGetPages(pages);
    lua += '\n\n';
  }

  // GetProperties / RectifyProperties (only if design properties defined)
  const designProps = dataModel.getDesignProperties();
  if (designProps.length > 0) {
    lua += generateGetProperties(designProps);
    lua += '\n\n';
    lua += generateRectifyProperties();
    lua += '\n\n';
  }

  // GetPins (only if pins defined)
  const pins = dataModel.getPins();
  if (pins.length > 0) {
    lua += generateGetPins(pins);
    lua += '\n\n';
  }

  // GetControls (global — all controls from all pages)
  lua += generateGetControls(allControls, autoStatus);
  lua += '\n\n';

  // GetControlLayout (per-page conditionals if 2+ pages)
  lua += generateGetControlLayout(dataModel, pages);

  // Status constants
  if (autoStatus) {
    lua += '\n\n' + generateStatusConstants();
  }

  // Runtime (global — ComboBox choices + event handlers from all pages)
  const runtimeCode = generateRuntime(allControls, autoStatus);
  if (runtimeCode) {
    lua += '\n\n' + runtimeCode;
  }

  return lua;
}

// ── Header Comments ──
function generateHeaderComments(pluginName, authorName) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const now = new Date();
  const dateStr = `${months[now.getMonth()]} ${now.getFullYear()}`;

  // Strip folder prefix(es) — "Folder~Sub~Name" → "Name"
  const displayName = pluginName ? pluginName.split('~').pop() : '';

  let code = '';
  if (displayName) code += `-- ${displayName}\n`;
  if (authorName) code += `-- by ${authorName}\n`;
  code += `-- ${dateStr}`;
  return code;
}

// ── PluginInfo ──
function generatePluginInfo(pi) {
  let code = 'PluginInfo = {\n';

  // Required fields (always emitted)
  code += `  Name = "${luaEscape(pi.Name || '')}",\n`;
  code += `  Version = "${luaEscape(pi.Version || '')}",\n`;
  code += `  Id = "${luaEscape(pi.Id || '')}",\n`;

  // Optional string fields
  if (pi.Description) code += `  Description = "${luaEscape(pi.Description)}",\n`;
  if (pi.BuildVersion) code += `  BuildVersion = "${luaEscape(pi.BuildVersion)}",\n`;
  if (pi.Author) code += `  Author = "${luaEscape(pi.Author)}",\n`;
  if (pi.Manufacturer) code += `  Manufacturer = "${luaEscape(pi.Manufacturer)}",\n`;
  if (pi.Model) code += `  Model = "${luaEscape(pi.Model)}",\n`;

  // Boolean fields
  if (pi.IsManaged) code += '  IsManaged = true,\n';
  if (pi.Type) code += `  Type = "${luaEscape(pi.Type)}",\n`;
  if (pi.ShowDebug) code += '  ShowDebug = true,\n';

  code += '}';
  return code;
}

// ── GetProperties ──
function generateGetProperties(props) {
  let code = 'function GetProperties()\n';
  code += '  local properties = {}\n';
  for (const prop of props) {
    code += '  table.insert(properties, {\n';
    code += `    Name = "${luaEscape(prop.Name)}",\n`;
    code += `    Type = "${prop.Type}",\n`;

    // Value
    if (prop.Type === 'boolean') {
      code += `    Value = ${prop.Value ? 'true' : 'false'},\n`;
    } else if (prop.Type === 'integer') {
      code += `    Value = ${parseInt(prop.Value) || 0},\n`;
    } else if (prop.Type === 'double') {
      code += `    Value = ${parseFloat(prop.Value) || 0},\n`;
    } else if (prop.Type === 'enum') {
      if (prop.Value) code += `    Value = "${luaEscape(prop.Value)}",\n`;
    } else {
      // string
      code += `    Value = "${luaEscape(prop.Value || '')}",\n`;
    }

    // Choices (enum only)
    if (prop.Type === 'enum' && prop.Choices && prop.Choices.length > 0) {
      code += '    Choices = {';
      code += prop.Choices.map(c => `"${luaEscape(c)}"`).join(', ');
      code += '},\n';
    }

    // Min/Max (integer and double)
    if ((prop.Type === 'integer' || prop.Type === 'double') && prop.Min !== undefined && prop.Min !== '') {
      code += `    Min = ${Number(prop.Min)},\n`;
    }
    if ((prop.Type === 'integer' || prop.Type === 'double') && prop.Max !== undefined && prop.Max !== '') {
      code += `    Max = ${Number(prop.Max)},\n`;
    }

    // Optional metadata
    if (prop.Header) code += `    Header = "${luaEscape(prop.Header)}",\n`;
    if (prop.Comment) code += `    Comment = "${luaEscape(prop.Comment)}",\n`;
    if (prop.Description) code += `    Description = "${luaEscape(prop.Description)}",\n`;

    code += '  })\n';
  }
  code += '  return properties\n';
  code += 'end';
  return code;
}

function generateRectifyProperties() {
  let code = 'function RectifyProperties(props)\n';
  code += '  return props\n';
  code += 'end';
  return code;
}

// ── GetPages ──
function generateGetPages(pages) {
  let code = 'PageNames = { ';
  code += pages.map(p => `"${luaEscape(p.name)}"`).join(', ');
  code += ' }\n\n';
  code += 'function GetPages(props)\n';
  code += '  local pages = {}\n';
  code += '  for ix, name in ipairs(PageNames) do\n';
  code += '    table.insert(pages, {name = PageNames[ix]})\n';
  code += '  end\n';
  code += '  return pages\n';
  code += 'end';
  return code;
}

// ── GetPins ──
function generateGetPins(pins) {
  let code = 'function GetPins(props)\n';
  code += '  local pins = {}\n';
  for (const pin of pins) {
    code += '  table.insert(pins, {\n';
    code += `    Name = "${luaEscape(pin.Name)}",\n`;
    code += `    Direction = "${pin.Direction}",\n`;
    if (pin.Domain === 'serial') {
      code += '    Domain = "serial",\n';
    }
    code += '  })\n';
  }
  code += '  return pins\n';
  code += 'end';
  return code;
}

// ── Grouping helper ──
// Splits controls into standalone + array groups (by arrayGroup UUID)
function groupControls(controls) {
  const standalones = [];
  const groups = new Map();

  for (const ctrl of controls) {
    if (ctrl.arrayGroup) {
      if (!groups.has(ctrl.arrayGroup)) {
        groups.set(ctrl.arrayGroup, []);
      }
      groups.get(ctrl.arrayGroup).push(ctrl);
    } else {
      standalones.push(ctrl);
    }
  }

  // Sort each group by arrayIndex
  for (const [, members] of groups) {
    members.sort((a, b) => a.arrayIndex - b.arrayIndex);
  }

  return { standalones, groups };
}

// ── GetControls ──
function generateGetControls(controls, autoStatus) {
  const { standalones, groups } = groupControls(controls);

  let code = 'function GetControls(props)\n';
  code += '  local ctrls = {}\n';

  // Auto-generated Status control
  if (autoStatus) {
    code += '  -- Status\n';
    code += '  table.insert(ctrls, {\n';
    code += '    Name = "Status",\n';
    code += '    ControlType = "Indicator",\n';
    code += '    IndicatorType = "Status",\n';
    code += '    UserPin = true,\n';
    code += '    PinStyle = "Output",\n';
    code += '  })\n';
  }

  // Standalone controls
  for (const ctrl of standalones) {
    code += `  -- ${ctrl.controlDef.Name}\n`;
    code += emitControlEntry(ctrl.controlDef, 1);
  }

  // Array groups — one entry with Count
  for (const [, members] of groups) {
    code += `  -- ${members[0].controlDef.Name} (array of ${members.length})\n`;
    code += emitControlEntry(members[0].controlDef, members.length);
  }

  code += '  return ctrls\n';
  code += 'end';
  return code;
}

function emitControlEntry(cd, count) {
  let code = '  table.insert(ctrls, {\n';
  code += `    Name = "${cd.Name}",\n`;
  code += `    ControlType = "${cd.ControlType}",\n`;

  if (cd.ControlType === 'Button' && cd.ButtonType) {
    code += `    ButtonType = "${cd.ButtonType}",\n`;
  }
  if (cd.ControlType === 'Knob') {
    if (cd.ControlUnit) code += `    ControlUnit = "${cd.ControlUnit}",\n`;
    if (cd.Min !== undefined) code += `    Min = ${cd.Min},\n`;
    if (cd.Max !== undefined) code += `    Max = ${cd.Max},\n`;
  }
  if (cd.ControlType === 'Indicator' && cd.IndicatorType) {
    code += `    IndicatorType = "${cd.IndicatorType}",\n`;
  }

  if (count > 1) {
    code += `    Count = ${count},\n`;
  }
  code += `    UserPin = ${cd.UserPin ? 'true' : 'false'},\n`;
  if (cd.UserPin && cd.PinStyle) {
    code += `    PinStyle = "${cd.PinStyle}",\n`;
  }

  code += '  })\n';
  return code;
}

// ── GetControlLayout ──
function generateGetControlLayout(dataModel, pages) {
  let code = 'function GetControlLayout(props)\n';
  code += '  local layout = {}\n';
  code += '  local graphics = {}\n';

  if (pages.length === 1) {
    // Single page: flat output (backward compatible) — include all objects
    const controls = dataModel.getObjectsByKindGlobal('control');
    const graphicObjs = dataModel.getObjectsByKindGlobal('graphic');
    code += emitLayoutEntries(controls, graphicObjs, '  ');
  } else {
    // Multi-page: unassigned objects first, then page conditionals
    const unassignedControls = dataModel.getUnassignedObjectsByKind('control');
    const unassignedGraphics = dataModel.getUnassignedObjectsByKind('graphic');

    if (unassignedControls.length > 0 || unassignedGraphics.length > 0) {
      code += '\n  -- Objects on all pages\n';
      code += emitLayoutEntries(unassignedControls, unassignedGraphics, '  ');
    }

    code += '\n  local CurrentPage = PageNames[props["page_index"].Value]\n';

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const controls = dataModel.getObjectsByKindForPage('control', page.id);
      const graphicObjs = dataModel.getObjectsByKindForPage('graphic', page.id);

      if (i === 0) {
        code += `\n  if CurrentPage == "${luaEscape(page.name)}" then\n`;
      } else {
        code += `  elseif CurrentPage == "${luaEscape(page.name)}" then\n`;
      }
      code += `    -- ${luaEscape(page.name)}\n`;

      code += emitLayoutEntries(controls, graphicObjs, '    ');
    }

    code += '  end\n';
  }

  code += '\n  return layout, graphics\n';
  code += 'end';
  return code;
}

// ── Shared layout/graphic emission ──
function emitLayoutEntries(controls, graphics, I) {
  const { standalones, groups } = groupControls(controls);
  let code = '';

  // Standalone controls
  for (const ctrl of standalones) {
    code += '\n';
    code += `${I}-- ${ctrl.controlDef.Name}\n`;
    code += `${I}layout["${ctrl.controlDef.Name}"] = {\n`;
    code += emitLayoutBody(ctrl, I + '  ');
    code += `${I}}\n`;
  }

  // Array members — each gets its own entry
  for (const [, members] of groups) {
    code += `\n${I}-- ${members[0].controlDef.Name} (array)\n`;
    for (const member of members) {
      code += `${I}layout["${member.controlDef.Name} ${member.arrayIndex}"] = {\n`;
      code += emitLayoutBody(member, I + '  ');
      code += `${I}}\n`;
    }
  }

  // Graphics entries
  for (const gfx of graphics) {
    const gp = gfx.graphicProps;
    const gfxLabel = gp.Text ? `${gp.Type}: ${gp.Text}` : gp.Type;
    code += '\n';
    code += `${I}-- ${gfxLabel}\n`;
    code += `${I}table.insert(graphics, {\n`;
    code += `${I}  Type = "${gp.Type}",\n`;
    code += `${I}  Position = {${gfx.x}, ${gfx.y}},\n`;
    code += `${I}  Size = {${gfx.w}, ${gfx.h}},\n`;

    if (gp.Text) code += `${I}  Text = "${gp.Text}",\n`;
    if (gp.Color) code += `${I}  Color = ${luaColor(gp.Color)},\n`;
    if (gp.Fill) code += `${I}  Fill = ${luaColor(gp.Fill)},\n`;
    if (gp.Font && gp.Font !== 'Roboto') code += `${I}  Font = "${gp.Font}",\n`;
    if (gp.FontStyle && gp.FontStyle !== 'Regular') code += `${I}  FontStyle = "${gp.FontStyle}",\n`;
    if (gp.FontSize) code += `${I}  FontSize = ${gp.FontSize},\n`;
    if (gp.IsBold) code += `${I}  IsBold = true,\n`;
    if (gp.HTextAlign && gp.HTextAlign !== 'Center') code += `${I}  HTextAlign = "${gp.HTextAlign}",\n`;
    if (gp.VTextAlign && gp.VTextAlign !== 'Center') code += `${I}  VTextAlign = "${gp.VTextAlign}",\n`;
    if (gp.StrokeColor) code += `${I}  StrokeColor = ${luaColor(gp.StrokeColor)},\n`;
    if (gp.StrokeWidth !== undefined && gp.StrokeWidth !== 0) code += `${I}  StrokeWidth = ${gp.StrokeWidth},\n`;
    if (gp.CornerRadius) code += `${I}  CornerRadius = ${gp.CornerRadius},\n`;
    if (gp.Image) code += `${I}  Image = "${gp.Image}",\n`;
    if (gp.Margin) code += `${I}  Margin = ${gp.Margin},\n`;
    if (gp.Padding !== undefined && gp.Padding !== 1) code += `${I}  Padding = ${gp.Padding},\n`;

    code += `${I}})\n`;
  }

  return code;
}

function emitLayoutBody(ctrl, I) {
  const lp = ctrl.layoutProps;
  let code = '';

  code += `${I}Style = "${lp.Style}",\n`;
  code += `${I}Position = {${ctrl.x}, ${ctrl.y}},\n`;
  code += `${I}Size = {${ctrl.w}, ${ctrl.h}},\n`;

  if (lp.PrettyName) code += `${I}PrettyName = "${lp.PrettyName}",\n`;
  if (lp.Color) code += `${I}Color = ${luaColor(lp.Color)},\n`;
  if (lp.TextColor) code += `${I}TextColor = ${luaColor(lp.TextColor)},\n`;
  if (lp.Font && lp.Font !== 'Roboto') code += `${I}Font = "${lp.Font}",\n`;
  if (lp.FontStyle && lp.FontStyle !== 'Regular') code += `${I}FontStyle = "${lp.FontStyle}",\n`;
  if (lp.FontSize) code += `${I}FontSize = ${lp.FontSize},\n`;
  if (lp.IsBold) code += `${I}IsBold = true,\n`;
  if (lp.HTextAlign && lp.HTextAlign !== 'Center') code += `${I}HTextAlign = "${lp.HTextAlign}",\n`;
  if (lp.VTextAlign && lp.VTextAlign !== 'Center') code += `${I}VTextAlign = "${lp.VTextAlign}",\n`;
  if (lp.IsReadOnly) code += `${I}IsReadOnly = true,\n`;
  if (lp.Margin) code += `${I}Margin = ${lp.Margin},\n`;
  if (lp.Padding !== undefined && lp.Padding !== 1) code += `${I}Padding = ${lp.Padding},\n`;
  if (lp.CornerRadius) code += `${I}CornerRadius = ${lp.CornerRadius},\n`;
  if (lp.StrokeColor) code += `${I}StrokeColor = ${luaColor(lp.StrokeColor)},\n`;
  if (lp.StrokeWidth !== undefined && lp.StrokeWidth !== 1) code += `${I}StrokeWidth = ${lp.StrokeWidth},\n`;

  // Button-specific
  if (lp.Style === 'Button') {
    if (lp.ButtonStyle) code += `${I}ButtonStyle = "${lp.ButtonStyle}",\n`;
    if (lp.ButtonVisualStyle && lp.ButtonVisualStyle !== 'Gloss') code += `${I}ButtonVisualStyle = "${lp.ButtonVisualStyle}",\n`;
    if (lp.Legend) code += `${I}Legend = "${lp.Legend}",\n`;
    if (lp.UnlinkOffColor) {
      code += `${I}UnlinkOffColor = true,\n`;
      if (lp.OffColor) code += `${I}OffColor = ${luaColor(lp.OffColor)},\n`;
    }
    if (lp.IconColor) code += `${I}IconColor = ${luaColor(lp.IconColor)},\n`;
    if (lp.WordWrap) code += `${I}WordWrap = true,\n`;
  }

  // Fader-specific
  if (lp.Style === 'Fader' && lp.ShowTextbox) {
    code += `${I}ShowTextbox = true,\n`;
  }

  // Meter-specific
  if (lp.Style === 'Meter') {
    if (lp.MeterStyle) code += `${I}MeterStyle = "${lp.MeterStyle}",\n`;
    if (lp.BackgroundColor) code += `${I}BackgroundColor = ${luaColor(lp.BackgroundColor)},\n`;
    if (lp.ShowTextbox === false) code += `${I}ShowTextbox = false,\n`;
  }

  // Text-specific
  if (lp.Style === 'Text') {
    if (lp.TextBoxStyle && lp.TextBoxStyle !== 'Normal') code += `${I}TextBoxStyle = "${lp.TextBoxStyle}",\n`;
    if (lp.WordWrap) code += `${I}WordWrap = true,\n`;
  }

  return code;
}

// ── Status Constants ──
function generateStatusConstants() {
  let code = 'STATUSES = {\n';
  code += '  OK = 0,\n';
  code += '  COMPROMISED = 1,\n';
  code += '  FAULT = 2,\n';
  code += '  NOT_PRESENT = 3,\n';
  code += '  MISSING = 4,\n';
  code += '  INITIALIZING = 5\n';
  code += '}';
  return code;
}

// ── Runtime (ComboBox choices + Event Handlers) ──

// Types that support EventHandler (Indicator is display-only)
const EVENT_TYPES = new Set(['Button', 'Knob', 'Text']);

function generateRuntime(controls, autoStatus) {
  const { standalones, groups } = groupControls(controls);

  // Build logical control list (one entry per unique control/array)
  const logicalControls = [];
  for (const ctrl of standalones) {
    logicalControls.push({ cd: ctrl.controlDef, count: 1, members: [ctrl] });
  }
  for (const [, members] of groups) {
    logicalControls.push({ cd: members[0].controlDef, count: members.length, members });
  }

  // Filter for combo and event controls
  const comboEntries = logicalControls.filter(e => {
    const style = e.members[0].layoutProps.Style;
    const items = e.cd.comboBoxItems;
    return (style === 'ComboBox' || style === 'ListBox') && items && items.length > 0;
  });

  const eventEntries = logicalControls.filter(e => EVENT_TYPES.has(e.cd.ControlType));

  if (comboEntries.length === 0 && eventEntries.length === 0 && !autoStatus) return '';

  let code = 'if Controls then\n';

  // SetStatus helper
  if (autoStatus) {
    code += '  function SetStatus(status, text)\n';
    code += '    assert(type(status) == "number", "status must be a number")\n';
    code += '    Controls.Status.Value = status\n';
    code += '    if text ~= nil then\n';
    code += '      Controls.Status.String = text\n';
    code += '    end\n';
    code += '  end\n';
    if (comboEntries.length > 0 || eventEntries.length > 0) code += '\n';
  }

  // ComboBox/ListBox choices
  if (comboEntries.length > 0) {
    code += '  -- ComboBox/ListBox choices\n';
    for (const entry of comboEntries) {
      const items = entry.cd.comboBoxItems;
      const mode = entry.cd.comboBoxMode || 'simple';
      const name = entry.cd.Name;
      const safeName = name.replace(/[^A-Za-z0-9_]/g, '_');

      code += `  local ${safeName}_Choices = {\n`;

      if (mode === 'simple') {
        for (let i = 0; i < items.length; i++) {
          const text = typeof items[i] === 'string' ? items[i] : (items[i].text || '');
          const comma = i < items.length - 1 ? ',' : '';
          code += `    "${luaEscape(text)}"${comma}\n`;
        }
      } else {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const text = typeof item === 'object' ? (item.text || '') : item;
          const value = typeof item === 'object' ? (item.value || '') : '';
          const comma = i < items.length - 1 ? ',' : '';
          code += '    {\n';
          code += `      Text = "${luaEscape(text)}",\n`;
          code += `      Value = ${luaLiteral(value)}\n`;
          code += `    }${comma}\n`;
        }
      }

      code += '  }\n';

      if (entry.count > 1) {
        code += `  for i = 1, ${entry.count} do\n`;
        code += `    Controls["${name} "..i].Choices = ${safeName}_Choices\n`;
        code += '  end\n';
      } else {
        code += `  Controls["${name}"].Choices = ${safeName}_Choices\n`;
      }
    }
    if (eventEntries.length > 0) code += '\n';
  }

  // Event handlers
  if (eventEntries.length > 0) {
    code += '  -- Event Handlers\n';

    // Define named handler functions for array controls first
    const arrayEntries = eventEntries.filter(e => e.count > 1);
    for (const entry of arrayEntries) {
      const safeName = entry.cd.Name.replace(/[^A-Za-z0-9_]/g, '_');
      code += `  function ${safeName}_Handler(ctl, i)\n`;
      code += '    print(ctl, i)\n';
      code += '  end\n';
    }

    for (const entry of eventEntries) {
      if (entry.count > 1) {
        const safeName = entry.cd.Name.replace(/[^A-Za-z0-9_]/g, '_');
        code += `  for i = 1, ${entry.count} do\n`;
        code += `    Controls["${entry.cd.Name} "..i].EventHandler = function(ctl) ${safeName}_Handler(ctl, i) end\n`;
        code += '  end\n';
      } else {
        code += `  Controls["${entry.cd.Name}"].EventHandler = function(ctl)\n`;
        code += '    print(ctl)\n';
        code += '  end\n';
      }
    }
  }

  code += 'end';
  return code;
}

function luaEscape(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function luaLiteral(val) {
  if (val === '' || val === undefined || val === null) return '""';
  // If it looks like a number, emit it unquoted
  if (!isNaN(val) && val.toString().trim() !== '') return Number(val).toString();
  return `"${luaEscape(val.toString())}"`;
}

function luaColor(arr) {
  if (!arr || arr.length < 3) return '{0, 0, 0}';
  if (arr.length >= 4) {
    return `{${arr[0]}, ${arr[1]}, ${arr[2]}, ${arr[3]}}`;
  }
  return `{${arr[0]}, ${arr[1]}, ${arr[2]}}`;
}
