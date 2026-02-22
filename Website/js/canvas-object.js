import { colorToCSS } from './utils.js';

const RESIZE_DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** Create a DOM element for a canvas object */
export function createObjectElement(obj) {
  const el = document.createElement('div');
  el.className = 'canvas-object';
  el.dataset.id = obj.id;

  // Label span
  const label = document.createElement('span');
  label.className = 'object-label';
  el.appendChild(label);

  // Resize handles
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

  // Type-specific data attributes (drive CSS styling)
  if (obj.kind === 'control') {
    const style = obj.layoutProps.Style || 'Button';
    el.dataset.style = style;
    delete el.dataset.graphicType;
    updateControlVisuals(el, obj);
  } else {
    const gtype = obj.graphicProps.Type || 'Label';
    el.dataset.graphicType = gtype;
    delete el.dataset.style;
    updateGraphicVisuals(el, obj);
  }
}

function updateControlVisuals(el, obj) {
  const label = el.querySelector('.object-label');
  const lp = obj.layoutProps;
  const cd = obj.controlDef;

  // Label text — show "Name idx" for array members
  label.textContent = obj.arrayGroup ? `${cd.Name} ${obj.arrayIndex}` : cd.Name;

  // Array index badge
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

  // Apply user-specified colors as inline styles (override CSS defaults)
  if (lp.Color) {
    if (lp.Style === 'Button') {
      el.style.backgroundColor = colorToCSS(lp.Color);
    } else if (lp.Style === 'Led') {
      el.style.background = `radial-gradient(circle at 40% 40%, ${colorToCSS(lp.Color)}, #111)`;
    }
  }

  if (lp.TextColor) {
    el.style.color = colorToCSS(lp.TextColor);
  }

  if (lp.FontSize) {
    label.style.fontSize = lp.FontSize + 'px';
  }

  // Legend for buttons
  if (lp.Style === 'Button' && lp.Legend) {
    label.textContent = lp.Legend;
  }

  // LEDs have no text
  if (lp.Style === 'Led') {
    label.textContent = '';
  }

  // Meter bar indicator
  if (lp.Style === 'Meter') {
    el.style.position = 'absolute'; // already set by class, but be sure
    if (!el.querySelector('.meter-fill')) {
      const fill = document.createElement('div');
      fill.className = 'meter-fill';
      fill.style.cssText = 'position:absolute;left:1px;top:1px;bottom:1px;width:40%;background:linear-gradient(to right,#0a0,#8f0);border-radius:1px;pointer-events:none;';
      el.insertBefore(fill, label);
    }
  }

  // ComboBox dropdown arrow
  if (lp.Style === 'ComboBox') {
    label.textContent = cd.Name + ' \u25BC';
  }

  // Corner radius
  if (lp.CornerRadius !== undefined || lp.Radius !== undefined) {
    el.style.borderRadius = (lp.CornerRadius || lp.Radius || 0) + 'px';
  }
}

function detectImageMime(base64) {
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('R0lGOD')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/png';
}

function updateGraphicVisuals(el, obj) {
  const label = el.querySelector('.object-label');
  const gp = obj.graphicProps;

  // Image / SVG types
  if (gp.Type === 'image' || gp.Type === 'svg') {
    let img = el.querySelector('.object-image');
    if (gp.Image) {
      if (!img) {
        img = document.createElement('img');
        img.className = 'object-image';
        el.insertBefore(img, label);
      }
      const mime = gp.Type === 'svg' ? 'image/svg+xml' : detectImageMime(gp.Image);
      const src = `data:${mime};base64,${gp.Image}`;
      if (img.dataset.src !== src) {
        img.src = src;
        img.dataset.src = src;
      }
      label.textContent = '';
    } else {
      if (img) img.remove();
      label.textContent = gp.Type === 'svg' ? '[SVG]' : '[Image]';
    }
    return;
  }

  // Remove stale image element if type changed
  const staleImg = el.querySelector('.object-image');
  if (staleImg) staleImg.remove();

  label.textContent = gp.Text || '';

  if (gp.Fill) {
    el.style.backgroundColor = colorToCSS(gp.Fill);
  }
  if (gp.Color) {
    el.style.color = colorToCSS(gp.Color);
  }
  if (gp.StrokeColor) {
    el.style.borderColor = colorToCSS(gp.StrokeColor);
  }
  if (gp.StrokeWidth !== undefined) {
    el.style.borderWidth = gp.StrokeWidth + 'px';
    el.style.borderStyle = gp.StrokeWidth > 0 ? 'solid' : 'none';
  }
  if (gp.FontSize) {
    label.style.fontSize = gp.FontSize + 'px';
  }
  if (gp.IsBold) {
    label.style.fontWeight = 'bold';
  }
  if (gp.HTextAlign) {
    el.style.justifyContent = gp.HTextAlign === 'Left' ? 'flex-start' :
                              gp.HTextAlign === 'Right' ? 'flex-end' : 'center';
  }
  if (gp.CornerRadius !== undefined || gp.Radius !== undefined) {
    el.style.borderRadius = (gp.CornerRadius || gp.Radius || 0) + 'px';
  }
}
