// All functions take an array of rects: [{id, x, y, w, h}, ...]
// and return an array of updates: [{id, changes: {x?, y?, w?, h?}}, ...]
// Anchor rect is the reference item (first-selected or last-selected).

export function alignLeft(rects, anchor) {
  const targetX = anchor.x;
  return rects.map(r => ({ id: r.id, changes: { x: targetX } }));
}

export function alignRight(rects, anchor) {
  const targetRight = anchor.x + anchor.w;
  return rects.map(r => ({ id: r.id, changes: { x: targetRight - r.w } }));
}

export function alignTop(rects, anchor) {
  const targetY = anchor.y;
  return rects.map(r => ({ id: r.id, changes: { y: targetY } }));
}

export function alignBottom(rects, anchor) {
  const targetBottom = anchor.y + anchor.h;
  return rects.map(r => ({ id: r.id, changes: { y: targetBottom - r.h } }));
}

export function alignCenterHorizontal(rects, anchor) {
  const targetCenter = anchor.x + anchor.w / 2;
  return rects.map(r => ({ id: r.id, changes: { x: Math.round(targetCenter - r.w / 2) } }));
}

export function alignCenterVertical(rects, anchor) {
  const targetCenter = anchor.y + anchor.h / 2;
  return rects.map(r => ({ id: r.id, changes: { y: Math.round(targetCenter - r.h / 2) } }));
}

export function centerOnPageHorizontal(rects, canvasWidth) {
  const minX = Math.min(...rects.map(r => r.x));
  const maxRight = Math.max(...rects.map(r => r.x + r.w));
  const groupWidth = maxRight - minX;
  const offset = Math.round((canvasWidth - groupWidth) / 2) - minX;
  return rects.map(r => ({ id: r.id, changes: { x: r.x + offset } }));
}

export function centerOnPageVertical(rects, canvasHeight) {
  const minY = Math.min(...rects.map(r => r.y));
  const maxBottom = Math.max(...rects.map(r => r.y + r.h));
  const groupHeight = maxBottom - minY;
  const offset = Math.round((canvasHeight - groupHeight) / 2) - minY;
  return rects.map(r => ({ id: r.id, changes: { y: r.y + offset } }));
}

export function makeSameWidth(rects, anchor) {
  if (rects.length < 2) return [];
  const refWidth = anchor.w;
  return rects.map(r => ({ id: r.id, changes: { w: refWidth } }));
}

export function makeSameHeight(rects, anchor) {
  if (rects.length < 2) return [];
  const refHeight = anchor.h;
  return rects.map(r => ({ id: r.id, changes: { h: refHeight } }));
}

export function makeSameSize(rects, anchor) {
  if (rects.length < 2) return [];
  const refW = anchor.w;
  const refH = anchor.h;
  return rects.map(r => ({ id: r.id, changes: { w: refW, h: refH } }));
}

export function distributeHorizontally(rects) {
  if (rects.length < 3) return [];
  const sorted = [...rects].sort((a, b) => a.x - b.x);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalWidth = sorted.reduce((sum, r) => sum + r.w, 0);
  const totalSpan = (last.x + last.w) - first.x;
  const gap = (totalSpan - totalWidth) / (sorted.length - 1);
  let currentX = first.x;
  return sorted.map(r => {
    const update = { id: r.id, changes: { x: Math.round(currentX) } };
    currentX += r.w + gap;
    return update;
  });
}

export function distributeVertically(rects) {
  if (rects.length < 3) return [];
  const sorted = [...rects].sort((a, b) => a.y - b.y);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalHeight = sorted.reduce((sum, r) => sum + r.h, 0);
  const totalSpan = (last.y + last.h) - first.y;
  const gap = (totalSpan - totalHeight) / (sorted.length - 1);
  let currentY = first.y;
  return sorted.map(r => {
    const update = { id: r.id, changes: { y: Math.round(currentY) } };
    currentY += r.h + gap;
    return update;
  });
}

export function packLeft(rects) {
  if (rects.length < 2) return [];
  // Align left edges, stack vertically (sorted by Y position)
  const minX = Math.min(...rects.map(r => r.x));
  const sorted = [...rects].sort((a, b) => a.y - b.y);
  let currentY = sorted[0].y;
  return sorted.map(r => {
    const update = { id: r.id, changes: { x: minX, y: currentY } };
    currentY += r.h;
    return update;
  });
}

export function packRight(rects) {
  if (rects.length < 2) return [];
  // Align right edges, stack vertically (sorted by Y position)
  const maxRight = Math.max(...rects.map(r => r.x + r.w));
  const sorted = [...rects].sort((a, b) => a.y - b.y);
  let currentY = sorted[0].y;
  return sorted.map(r => {
    const update = { id: r.id, changes: { x: maxRight - r.w, y: currentY } };
    currentY += r.h;
    return update;
  });
}

export function packTop(rects) {
  if (rects.length < 2) return [];
  // Align top edges, stack horizontally (sorted by X position)
  const minY = Math.min(...rects.map(r => r.y));
  const sorted = [...rects].sort((a, b) => a.x - b.x);
  let currentX = sorted[0].x;
  return sorted.map(r => {
    const update = { id: r.id, changes: { x: currentX, y: minY } };
    currentX += r.w;
    return update;
  });
}

export function packBottom(rects) {
  if (rects.length < 2) return [];
  // Align bottom edges, stack horizontally (sorted by X position)
  const maxBottom = Math.max(...rects.map(r => r.y + r.h));
  const sorted = [...rects].sort((a, b) => a.x - b.x);
  let currentX = sorted[0].x;
  return sorted.map(r => {
    const update = { id: r.id, changes: { x: currentX, y: maxBottom - r.h } };
    currentX += r.w;
    return update;
  });
}

export function spaceEvenlyHorizontal(rects, canvasWidth) {
  if (rects.length < 1) return [];
  if (rects.length === 1) {
    return [{ id: rects[0].id, changes: { x: 0 } }];
  }
  const sorted = [...rects].sort((a, b) => a.x - b.x);
  const totalWidth = sorted.reduce((sum, r) => sum + r.w, 0);
  const gap = (canvasWidth - totalWidth) / (sorted.length - 1);
  let currentX = 0;
  return sorted.map(r => {
    const update = { id: r.id, changes: { x: Math.round(currentX) } };
    currentX += r.w + gap;
    return update;
  });
}

export function spaceEvenlyVertical(rects, canvasHeight) {
  if (rects.length < 1) return [];
  if (rects.length === 1) {
    return [{ id: rects[0].id, changes: { y: 0 } }];
  }
  const sorted = [...rects].sort((a, b) => a.y - b.y);
  const totalHeight = sorted.reduce((sum, r) => sum + r.h, 0);
  const gap = (canvasHeight - totalHeight) / (sorted.length - 1);
  let currentY = 0;
  return sorted.map(r => {
    const update = { id: r.id, changes: { y: Math.round(currentY) } };
    currentY += r.h + gap;
    return update;
  });
}
