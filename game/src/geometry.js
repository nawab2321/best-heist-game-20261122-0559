export const TAU = Math.PI * 2;
export const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const angleBetween = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
export const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function circleHitsRect(x, y, radius, box) {
  const dx = x - clamp(x, box.x, box.x + box.w);
  const dy = y - clamp(y, box.y, box.y + box.h);
  return dx * dx + dy * dy < radius * radius;
}

export function solidAt(x, y, radius, blocks) {
  return blocks.some(box => circleHitsRect(x, y, radius, box));
}

export function slide(entity, dx, dy, blocks) {
  const x = entity.x;
  const y = entity.y;
  if (!solidAt(x + dx, y, entity.radius, blocks)) entity.x += dx;
  if (!solidAt(entity.x, y + dy, entity.radius, blocks)) entity.y += dy;
  return Math.hypot(entity.x - x, entity.y - y);
}

// Slab intersection returns the fraction along a segment of its first contact.
export function rayFraction(x, y, dx, dy, box, inset = 0) {
  const minX = box.x - inset;
  const minY = box.y - inset;
  const maxX = box.x + box.w + inset;
  const maxY = box.y + box.h + inset;
  if (dx === 0 && (x < minX || x > maxX)) return 1;
  if (dy === 0 && (y < minY || y > maxY)) return 1;
  const a = dx === 0 ? -Infinity : (minX - x) / dx;
  const b = dx === 0 ? Infinity : (maxX - x) / dx;
  const c = dy === 0 ? -Infinity : (minY - y) / dy;
  const d = dy === 0 ? Infinity : (maxY - y) / dy;
  const near = Math.max(0, Math.min(a, b), Math.min(c, d));
  const far = Math.min(Math.max(a, b), Math.max(c, d));
  return far >= near && near < 1 ? near : 1;
}

export function rayLimit(x, y, dx, dy, blocks, inset = 0) {
  let result = 1;
  for (const box of blocks) result = Math.min(result, rayFraction(x, y, dx, dy, box, inset));
  return result;
}

export function lineClear(a, b, blocks, inset = 0) {
  return rayLimit(a.x, a.y, b.x - a.x, b.y - a.y, blocks, inset) === 1;
}

export function pointToSegment(point, line) {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const t = clamp(((point.x - line.x1) * dx + (point.y - line.y1) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(point.x - line.x1 - t * dx, point.y - line.y1 - t * dy);
}

export function coneExposure(observer, player, blocks) {
  const dist = distance(observer, player);
  const range = observer.range * (player.stance === 'crouch' ? 0.77 : 1);
  if (dist > range) return 0;
  const deviation = Math.abs(angleDelta(angleBetween(observer, player), observer.angle));
  if (deviation > observer.fov / 2 || !lineClear(observer, player, blocks)) return 0;
  const intensity = 1 - dist / range * 0.58 - deviation / observer.fov * 0.30;
  return intensity * (player.stance === 'crouch' ? 0.53 : player.stance === 'sprint' ? 1.33 : 1);
}

// Include rays on both sides of obstacle corners to keep clipped silhouettes crisp.
export function conePolygon(observer, blocks) {
  const half = observer.fov / 2;
  const offsets = Array.from({ length: 25 }, (_, i) => -half + i * half / 12);
  for (const box of blocks) {
    if (observer.x + observer.range < box.x || observer.y + observer.range < box.y ||
        observer.x - observer.range > box.x + box.w || observer.y - observer.range > box.y + box.h) continue;
    for (const x of [box.x, box.x + box.w]) {
      for (const y of [box.y, box.y + box.h]) {
        const offset = angleDelta(Math.atan2(y - observer.y, x - observer.x), observer.angle);
        if (Math.abs(offset) + 0.0001 < half) offsets.push(offset - 0.0001, offset + 0.0001);
      }
    }
  }
  offsets.sort((a, b) => a - b);
  return offsets.map(offset => {
    const dx = Math.cos(observer.angle + offset) * observer.range;
    const dy = Math.sin(observer.angle + offset) * observer.range;
    const limit = rayLimit(observer.x, observer.y, dx, dy, blocks);
    return [observer.x + dx * limit, observer.y + dy * limit];
  });
}
