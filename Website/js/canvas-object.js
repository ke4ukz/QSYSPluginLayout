import { colorToCSS } from './utils.js';

const RESIZE_DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Create a DOM element for a canvas object */
export function createObjectElement(obj) {
  const el = document.createElement('div');
  el.className = 'canvas-object';
  el.dataset.id = obj.id;

  // Inner container for visual content (overflow clipped here)
  const body = document.createElement('div');
  body.className = 'control-body';
  el.appendChild(body);

  // Label span (inside body)
  const label = document.createElement('span');
  label.className = 'object-label';
  body.appendChild(label);

  // Resize handles (outside body, never clipped)
  for (const dir of RESIZE_DIRS) {
    const handle = document.createElement('div');
    handle.className = `resize-handle ${dir}`;
    handle.dataset.dir = dir;
    el.appendChild(handle);
  }

  updateObjectElement(el, obj);
  return el;
}

/** Update a DOM element to reflect current object state */
export function updateObjectElement(el, obj) {
  // Position & size
  el.style.left = obj.x + 'px';
  el.style.top = obj.y + 'px';
  el.style.width = obj.w + 'px';
  el.style.height = obj.h + 'px';
  el.style.zIndex = obj.zOrder;

  const body = el.querySelector('.control-body');

  // Type-specific data attributes (drive CSS styling)
  if (obj.kind === 'control') {
    const style = obj.layoutProps.Style || 'Button';
    el.dataset.style = style;
    delete el.dataset.graphicType;
    updateControlVisuals(el, body, obj);
  } else {
    const gtype = obj.graphicProps.Type || 'Label';
    el.dataset.graphicType = gtype;
    delete el.dataset.style;
    updateGraphicVisuals(body, obj);
  }
}

/* ── Cleanup helpers ── */

function cleanupStyleElements(body, keepStyle) {
  if (keepStyle !== 'Knob') {
    const svg = body.querySelector('.knob-svg');
    if (svg) svg.remove();
  }
  if (keepStyle !== 'Meter') {
    const bar = body.querySelector('.meter-bar');
    if (bar) bar.remove();
  }
  if (keepStyle !== 'Button') {
    const gloss = body.querySelector('.gloss-overlay');
    if (gloss) gloss.remove();
  }
  if (keepStyle !== 'Fader') {
    const track = body.querySelector('.fader-track');
    if (track) track.remove();
    const thumb = body.querySelector('.fader-thumb');
    if (thumb) thumb.remove();
  }
  // Remove legacy meter-fill (from old rendering)
  if (keepStyle !== 'Meter') {
    const oldFill = body.querySelector('.meter-fill');
    if (oldFill) oldFill.remove();
  }

  // Reset inline styles from previous styles
  body.style.background = '';
  body.style.backgroundColor = '';
  body.style.color = '';
  body.style.borderRadius = '';

  const label = body.querySelector('.object-label');
  if (label) {
    label.style.cssText = ''; // wipe all inline styles; CSS classes reapply base styles
  }
}

/* ── Control rendering ── */

function updateControlVisuals(el, body, obj) {
  const label = body.querySelector('.object-label');
  const lp = obj.layoutProps;
  const cd = obj.controlDef;
  const style = lp.Style || 'Button';

  // Label text — show "Name idx" for array members
  label.textContent = obj.arrayGroup ? `${cd.Name} ${obj.arrayIndex}` : cd.Name;

  // Array index badge (on outer element, not clipped)
  let badge = el.querySelector('.array-badge');
  if (obj.arrayGroup) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'array-badge';
      el.appendChild(badge);
    }
    badge.textContent = obj.arrayIndex;
  } else if (badge) {
    badge.remove();
  }

  // Clean up elements from other styles
  cleanupStyleElements(body, style);

  // Style-specific rendering
  switch (style) {
    case 'Knob':
      renderKnob(body, label, lp, cd);
      break;
    case 'Fader':
      renderFader(body, label, lp, cd);
      break;
    case 'Button':
      renderButton(body, label, lp, cd);
      break;
    case 'Led':
      renderLed(body, label, lp, cd);
      break;
    case 'Meter':
      renderMeter(body, label, lp, cd);
      break;
    case 'ComboBox':
      label.textContent = (obj.arrayGroup ? `${cd.Name} ${obj.arrayIndex}` : cd.Name) + ' \u25BC';
      applyCommonStyles(body, label, lp);
      break;
    default:
      applyCommonStyles(body, label, lp);
      break;
  }
}

/* ── Knob: half-circle pie chart with value textbox ── */

function renderKnob(body, label, lp, cd) {
  const svg = ensureKnobSVG(body);

  // Update fill color
  const hasColor = lp.Color && (lp.Color[0] || lp.Color[1] || lp.Color[2]);
  const fillColor = hasColor ? colorToCSS(lp.Color) : '#aaa';
  const fillPath = svg.querySelector('.knob-fill');
  fillPath.setAttribute('d', pieFillPath(50, 50, 50, 0.6));
  fillPath.setAttribute('fill', fillColor);

  // Semicircle height is always half the width (proper half-circle)
  // Read the control's actual pixel width from the parent canvas-object
  const el = body.parentElement;
  const w = parseFloat(el.style.width);
  const knobH = Math.round(w / 2);
  svg.style.height = knobH + 'px';

  if (lp.FontSize) {
    label.style.fontSize = lp.FontSize + 'px';
  }
}

function ensureKnobSVG(body) {
  let svg = body.querySelector('.knob-svg');
  if (svg) return svg;

  svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('knob-svg');
  svg.setAttribute('viewBox', '0 0 100 50');
  svg.setAttribute('preserveAspectRatio', 'none');

  // Background semicircle (fills entire viewBox)
  const bg = document.createElementNS(SVG_NS, 'path');
  bg.classList.add('knob-bg');
  bg.setAttribute('d', 'M 0 50 A 50 50 0 0 1 100 50 Z');
  svg.appendChild(bg);

  // Fill arc (colored, updated dynamically)
  const fill = document.createElementNS(SVG_NS, 'path');
  fill.classList.add('knob-fill');
  svg.appendChild(fill);

  // Border arc
  const border = document.createElementNS(SVG_NS, 'path');
  border.classList.add('knob-arc-border');
  border.setAttribute('d', 'M 0 50 A 50 50 0 0 1 100 50 Z');
  svg.appendChild(border);

  // Tick marks at start/end
  const leftTick = document.createElementNS(SVG_NS, 'line');
  leftTick.setAttribute('x1', '0'); leftTick.setAttribute('y1', '50');
  leftTick.setAttribute('x2', '0'); leftTick.setAttribute('y2', '43');
  leftTick.classList.add('knob-tick');
  svg.appendChild(leftTick);

  const rightTick = document.createElementNS(SVG_NS, 'line');
  rightTick.setAttribute('x1', '100'); rightTick.setAttribute('y1', '50');
  rightTick.setAttribute('x2', '100'); rightTick.setAttribute('y2', '43');
  rightTick.classList.add('knob-tick');
  svg.appendChild(rightTick);

  body.insertBefore(svg, body.firstChild);
  return svg;
}

/** Generate SVG path for a pie-slice fill within the semicircle */
function pieFillPath(cx, cy, r, fraction) {
  if (fraction <= 0) return '';
  if (fraction >= 1) return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z`;

  const angle = Math.PI * fraction;
  const endAngle = Math.PI - angle;
  const ex = cx + r * Math.cos(endAngle);
  const ey = cy - r * Math.sin(endAngle);

  // large-arc-flag is always 0: max sweep is 180° (full semicircle)
  return `M ${cx} ${cy} L ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)} Z`;
}

/* ── Meter: vertical bar with fill and value textbox ── */

function renderMeter(body, label, lp, cd) {
  const bar = ensureMeterBar(body);

  // Fill color
  const hasColor = lp.Color && (lp.Color[0] || lp.Color[1] || lp.Color[2]);
  const fillColor = hasColor ? colorToCSS(lp.Color) : '#00e664';
  const fill = bar.querySelector('.meter-fill');
  fill.style.background = fillColor;

  // Background color
  if (lp.BackgroundColor) {
    bar.style.backgroundColor = colorToCSS(lp.BackgroundColor);
  }

  // Show/hide textbox
  if (lp.ShowTextbox === false) {
    label.style.display = 'none';
  }

  if (lp.FontSize) {
    label.style.fontSize = lp.FontSize + 'px';
  }
}

function ensureMeterBar(body) {
  let bar = body.querySelector('.meter-bar');
  if (bar) return bar;

  bar = document.createElement('div');
  bar.className = 'meter-bar';

  const fill = document.createElement('div');
  fill.className = 'meter-fill';
  bar.appendChild(fill);

  body.insertBefore(bar, body.firstChild);
  return bar;
}

/* ── Button: rectangle with gloss overlay ── */

function renderButton(body, label, lp, cd) {
  // Determine the effective on color (default white if [0,0,0])
  const hasColor = lp.Color && (lp.Color[0] || lp.Color[1] || lp.Color[2]);
  const onColor = hasColor ? lp.Color : [255, 255, 255];

  // Show off state: either explicit OffColor or ~49% of on color
  if (lp.UnlinkOffColor && lp.OffColor) {
    body.style.backgroundColor = colorToCSS(lp.OffColor);
  } else {
    body.style.backgroundColor = colorToCSS([
      Math.round(onColor[0] * 0.49),
      Math.round(onColor[1] * 0.49),
      Math.round(onColor[2] * 0.49)
    ]);
  }

  // Gloss overlay
  if ((lp.ButtonVisualStyle || 'Gloss') === 'Gloss') {
    ensureGlossOverlay(body);
  } else {
    const gloss = body.querySelector('.gloss-overlay');
    if (gloss) gloss.remove();
  }

  // Button shows Legend text, not control name
  label.textContent = lp.Legend || '';

  if (lp.TextColor) {
    body.style.color = colorToCSS(lp.TextColor);
  }

  if (lp.CornerRadius !== undefined) {
    body.style.borderRadius = lp.CornerRadius + 'px';
  }

  if (lp.FontSize) {
    label.style.fontSize = lp.FontSize + 'px';
  }
}

function ensureGlossOverlay(body) {
  let overlay = body.querySelector('.gloss-overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.className = 'gloss-overlay';
  body.insertBefore(overlay, body.querySelector('.object-label'));
  return overlay;
}

/* ── LED: simple filled circle ── */

function renderLed(body, label, lp, cd) {
  // Show off state: ~49% of the on color
  if (lp.UnlinkOffColor && lp.OffColor) {
    body.style.backgroundColor = colorToCSS(lp.OffColor);
  } else if (lp.Color) {
    const c = lp.Color;
    body.style.backgroundColor = colorToCSS([
      Math.round(c[0] * 0.49),
      Math.round(c[1] * 0.49),
      Math.round(c[2] * 0.49)
    ]);
  }
  label.textContent = '';
}

/* ── Fader: proportional track + thumb, orientation-aware ── */

function renderFader(body, label, lp, cd) {
  ensureFaderElements(body);

  const el = body.parentElement;
  const w = parseFloat(el.style.width);
  const h = parseFloat(el.style.height);
  const isHorizontal = w > h;
  const showTB = !!lp.ShowTextbox;

  const track = body.querySelector('.fader-track');
  const thumb = body.querySelector('.fader-thumb');

  // Thumb fill color
  const hasColor = lp.Color && (lp.Color[0] || lp.Color[1] || lp.Color[2]);
  const thumbColor = hasColor ? colorToCSS(lp.Color) : '';

  if (isHorizontal) {
    // ── Horizontal fader ──
    const tbW = showTB ? Math.max(24, Math.round(h * 0.7)) : 0;
    const crossAxis = h;
    const trackThick = Math.max(4, Math.round(crossAxis * 0.12));
    const thumbW = Math.max(8, Math.round(crossAxis * 0.5));
    const thumbH = Math.max(6, Math.round(crossAxis * 0.72));
    const trackR = Math.round(trackThick / 2);
    const thumbR = Math.round(Math.min(thumbW, thumbH) * 0.35);

    track.style.cssText = `position:absolute; top:${Math.round((h - trackThick) / 2)}px; left:${tbW}px; right:0; height:${trackThick}px; border-radius:${trackR}px;`;
    thumb.style.cssText = `position:absolute; top:${Math.round((h - thumbH) / 2)}px; left:${tbW}px; width:${thumbW}px; height:${thumbH}px; border-radius:${thumbR}px;`;

    if (showTB) {
      label.style.cssText = `position:absolute; left:0; top:0; bottom:0; width:${tbW}px;`;
    } else {
      label.style.display = 'none';
    }
  } else {
    // ── Vertical fader ──
    const tbH = showTB ? 16 : 0;
    const crossAxis = w;
    const trackThick = Math.max(4, Math.round(crossAxis * 0.15));
    const thumbW = Math.max(8, Math.round(crossAxis * 0.75));
    const thumbH = Math.max(6, Math.round(crossAxis * 0.5));
    const trackR = Math.round(trackThick / 2);
    const thumbR = Math.round(Math.min(thumbW, thumbH) * 0.35);
    const trackAreaH = h - tbH;

    track.style.cssText = `position:absolute; left:${Math.round((w - trackThick) / 2)}px; top:0; height:${trackAreaH}px; width:${trackThick}px; border-radius:${trackR}px;`;

    // Thumb at bottom of track (representing 0/min value)
    const thumbTop = trackAreaH - thumbH;
    thumb.style.cssText = `position:absolute; left:${Math.round((w - thumbW) / 2)}px; top:${thumbTop}px; width:${thumbW}px; height:${thumbH}px; border-radius:${thumbR}px;`;

    if (showTB) {
      label.style.cssText = `position:absolute; left:0; right:0; bottom:0; height:${tbH}px;`;
    } else {
      label.style.display = 'none';
    }
  }

  if (thumbColor) thumb.style.backgroundColor = thumbColor;
  if (lp.FontSize) label.style.fontSize = lp.FontSize + 'px';
}

function ensureFaderElements(body) {
  if (!body.querySelector('.fader-track')) {
    const track = document.createElement('div');
    track.className = 'fader-track';
    body.insertBefore(track, body.firstChild);
  }

  if (!body.querySelector('.fader-thumb')) {
    const thumb = document.createElement('div');
    thumb.className = 'fader-thumb';
    const label = body.querySelector('.object-label');
    body.insertBefore(thumb, label);
  }
}

/* ── Common styling for Text/ListBox/ComboBox ── */

function applyCommonStyles(body, label, lp) {
  if (lp.Color && (lp.Color[0] || lp.Color[1] || lp.Color[2])) {
    body.style.backgroundColor = colorToCSS(lp.Color);
  }
  if (lp.TextColor) {
    body.style.color = colorToCSS(lp.TextColor);
  }
  if (lp.FontSize) {
    label.style.fontSize = lp.FontSize + 'px';
  }
  if (lp.CornerRadius !== undefined || lp.Radius !== undefined) {
    body.style.borderRadius = (lp.CornerRadius || lp.Radius || 0) + 'px';
  }
}

/* ── Graphic visuals ── */

function detectImageMime(base64) {
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('R0lGOD')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/png';
}

function updateGraphicVisuals(body, obj) {
  const label = body.querySelector('.object-label');
  const gp = obj.graphicProps;

  // Image / SVG types
  if (gp.Type === 'Image' || gp.Type === 'Svg') {
    let img = body.querySelector('.object-image');
    if (gp.Image) {
      if (!img) {
        img = document.createElement('img');
        img.className = 'object-image';
        body.insertBefore(img, label);
      }
      const mime = gp.Type === 'Svg' ? 'image/svg+xml' : detectImageMime(gp.Image);
      const src = `data:${mime};base64,${gp.Image}`;
      if (img.dataset.src !== src) {
        img.src = src;
        img.dataset.src = src;
      }
      label.textContent = '';
    } else {
      if (img) img.remove();
      label.textContent = gp.Type === 'Svg' ? '[SVG]' : '[Image]';
    }
    return;
  }

  // Remove stale image element if type changed
  const staleImg = body.querySelector('.object-image');
  if (staleImg) staleImg.remove();

  // GroupBox: fieldset-legend style rendering
  if (gp.Type === 'GroupBox') {
    renderGroupBox(body, label, gp);
    return;
  }

  // Header: horizontal bar with centered text
  if (gp.Type === 'Header') {
    renderHeader(body, label, gp);
    return;
  }

  label.textContent = gp.Text || '';

  if (gp.Fill) {
    body.style.backgroundColor = colorToCSS(gp.Fill);
  }
  if (gp.Color) {
    body.style.color = colorToCSS(gp.Color);
  }
  if (gp.StrokeColor) {
    body.style.borderColor = colorToCSS(gp.StrokeColor);
  }
  if (gp.StrokeWidth !== undefined) {
    body.style.borderWidth = gp.StrokeWidth + 'px';
    body.style.borderStyle = gp.StrokeWidth > 0 ? 'solid' : 'none';
  }
  if (gp.FontSize) {
    label.style.fontSize = gp.FontSize + 'px';
  }
  if (gp.IsBold) {
    label.style.fontWeight = 'bold';
  }
  if (gp.HTextAlign) {
    body.style.justifyContent = gp.HTextAlign === 'Left' ? 'flex-start' :
                              gp.HTextAlign === 'Right' ? 'flex-end' : 'center';
  }
  if (gp.CornerRadius !== undefined || gp.Radius !== undefined) {
    body.style.borderRadius = (gp.CornerRadius || gp.Radius || 0) + 'px';
  }
}

// Shared offscreen canvas for text measurement
const _measureCtx = document.createElement('canvas').getContext('2d');
function measureText(text, fontSize, font, bold) {
  _measureCtx.font = `${bold ? 'bold ' : ''}${fontSize}px ${font || 'sans-serif'}`;
  return _measureCtx.measureText(text).width;
}

function renderGroupBox(body, label, gp) {
  const strokeW = gp.StrokeWidth !== undefined ? gp.StrokeWidth : 1;
  const fontSize = gp.FontSize || 12;
  const textColor = gp.Color ? colorToCSS(gp.Color) : '#333';
  const fillColor = gp.Fill ? colorToCSS(gp.Fill) : 'transparent';
  const strokeColor = gp.StrokeColor ? colorToCSS(gp.StrokeColor) : '#000';
  const align = gp.HTextAlign || 'Center';
  const text = gp.Text || '';

  const w = body.clientWidth || 200;
  const h = body.clientHeight || 120;

  // Text element for display
  let textEl = body.querySelector('.groupbox-text');
  if (!textEl) {
    textEl = document.createElement('span');
    textEl.className = 'groupbox-text';
    body.appendChild(textEl);
  }
  textEl.textContent = text;
  textEl.style.fontSize = fontSize + 'px';
  textEl.style.fontWeight = gp.IsBold ? 'bold' : '';
  textEl.style.color = textColor;
  if (gp.Font) textEl.style.fontFamily = gp.Font;

  // Measure text using offscreen canvas (reliable, synchronous)
  const textW = measureText(text, fontSize, gp.Font, gp.IsBold);
  const notchPadX = 4;
  const notchPadY = 2;
  const half = strokeW / 2;
  const notchH = fontSize + notchPadY * 2 + strokeW;
  const notchW = Math.ceil(textW) + notchPadX * 2;

  // Notch X position based on alignment (always 8-corner concavity style)
  let notchX;
  if (align === 'Left') {
    notchX = half + 6;
  } else if (align === 'Right') {
    notchX = w - half - notchW - 6;
  } else {
    notchX = (w - notchW) / 2;
  }
  notchX = Math.max(strokeW, Math.min(notchX, w - notchW - strokeW));

  // Position text inside the notch
  textEl.style.left = (notchX + notchPadX) + 'px';
  textEl.style.top = (strokeW + notchPadY) + 'px';

  // SVG
  const svgNS = 'http://www.w3.org/2000/svg';
  let svg = body.querySelector('.groupbox-svg');
  if (!svg) {
    svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'groupbox-svg');
    body.insertBefore(svg, textEl);
  }
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  svg.style.width = w + 'px';
  svg.style.height = h + 'px';

  const top = half;
  const left = half;
  const right = w - half;
  const bottom = h - half;
  const nx1 = notchX;
  const nx2 = notchX + notchW;
  const nb = notchH;

  // Corner radius
  const cr = gp.CornerRadius || 0;
  const maxR = Math.min((nx1 - left) / 2, (right - nx2) / 2, (bottom - nb) / 2, notchW / 2, notchH - strokeW);
  const r = Math.max(0, Math.min(cr, maxR));

  // 8-corner path: notch cuts DOWN from top edge as a concavity
  let d;
  if (r > 0) {
    d = `M ${left},${top + r}`
      + ` A ${r},${r} 0 0 1 ${left + r},${top}`
      + ` L ${nx1 - r},${top}`
      + ` A ${r},${r} 0 0 1 ${nx1},${top + r}`
      + ` L ${nx1},${nb - r}`
      + ` A ${r},${r} 0 0 0 ${nx1 + r},${nb}`
      + ` L ${nx2 - r},${nb}`
      + ` A ${r},${r} 0 0 0 ${nx2},${nb - r}`
      + ` L ${nx2},${top + r}`
      + ` A ${r},${r} 0 0 1 ${nx2 + r},${top}`
      + ` L ${right - r},${top}`
      + ` A ${r},${r} 0 0 1 ${right},${top + r}`
      + ` L ${right},${bottom - r}`
      + ` A ${r},${r} 0 0 1 ${right - r},${bottom}`
      + ` L ${left + r},${bottom}`
      + ` A ${r},${r} 0 0 1 ${left},${bottom - r}`
      + ` Z`;
  } else {
    d = `M ${left},${top} L ${nx1},${top} L ${nx1},${nb} L ${nx2},${nb} L ${nx2},${top} L ${right},${top} L ${right},${bottom} L ${left},${bottom} Z`;
  }

  let path = svg.querySelector('path');
  if (!path) {
    path = document.createElementNS(svgNS, 'path');
    svg.appendChild(path);
  }
  // Clean up any leftover elements from previous approaches
  for (const el of svg.querySelectorAll('.groupbox-fill, .groupbox-stroke')) el.remove();

  path.setAttribute('d', d);
  path.setAttribute('fill', fillColor);
  path.setAttribute('stroke', strokeColor);
  path.setAttribute('stroke-width', strokeW);
  path.removeAttribute('fill-rule');

  label.textContent = '';
}

function renderHeader(body, label, gp) {
  const fontSize = gp.FontSize || 14;
  const color = gp.Color ? colorToCSS(gp.Color) : '#333';
  const align = gp.HTextAlign || 'Center';

  // Build: [line] text [line]  with the line broken around the text
  let wrapper = body.querySelector('.header-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'header-wrapper';
    const lineBefore = document.createElement('span');
    lineBefore.className = 'header-line header-line-before';
    const text = document.createElement('span');
    text.className = 'header-text';
    const lineAfter = document.createElement('span');
    lineAfter.className = 'header-line header-line-after';
    wrapper.appendChild(lineBefore);
    wrapper.appendChild(text);
    wrapper.appendChild(lineAfter);
    body.insertBefore(wrapper, label);
  }

  const lineBefore = wrapper.querySelector('.header-line-before');
  const lineAfter = wrapper.querySelector('.header-line-after');
  const text = wrapper.querySelector('.header-text');

  text.textContent = gp.Text || '';
  text.style.color = color;
  text.style.fontSize = fontSize + 'px';
  text.style.fontWeight = 'bold';
  if (gp.Font) text.style.fontFamily = gp.Font;

  // Same color for line and text
  lineBefore.style.borderBottomColor = color;
  lineAfter.style.borderBottomColor = color;

  // Alignment: adjust flex growth of lines
  if (align === 'Left') {
    lineBefore.style.flex = '0 0 6px';
    lineAfter.style.flex = '1';
  } else if (align === 'Right') {
    lineBefore.style.flex = '1';
    lineAfter.style.flex = '0 0 6px';
  } else {
    lineBefore.style.flex = '1';
    lineAfter.style.flex = '1';
  }

  label.textContent = '';
}
