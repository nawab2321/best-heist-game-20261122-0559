import { ARCHITECTURE, BANK, COVERS, VIEW } from './level.js';
import { TAU } from './geometry.js';

export const GOLD = '#e0b875';
export const MINT = '#a7f2dd';

export function fill(ctx, x, y, w, h, paint) {
  ctx.fillStyle = paint;
  ctx.fillRect(x, y, w, h);
}

export function path(ctx, points, paint, border, width = 1) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(...points[i]);
  if (paint) {
    ctx.closePath();
    ctx.fillStyle = paint;
    ctx.fill();
  }
  if (border) {
    ctx.lineWidth = width;
    ctx.strokeStyle = border;
    ctx.stroke();
  }
}

export function ellipse(ctx, x, y, rx, ry, paint, stroke, width = 1) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (paint) { ctx.fillStyle = paint; ctx.fill(); }
  if (stroke) { ctx.lineWidth = width; ctx.strokeStyle = stroke; ctx.stroke(); }
}

export function type(ctx, value, x, y, size = 12, color = GOLD, align = 'left', family = 'monospace', weight = 600) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

export function glow(ctx, x, y, radius, color) {
  const paint = ctx.createRadialGradient(x, y, 1, x, y, radius);
  paint.addColorStop(0, color);
  paint.addColorStop(1, 'transparent');
  fill(ctx, x - radius, y - radius, radius * 2, radius * 2, paint);
}

function randomGenerator(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function marble(ctx, x, y, w, h, cool, seed) {
  const random = randomGenerator(seed);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const tile = cool ? 34 : 45;
  for (let row = 0; row < h / tile; row += 1) {
    for (let col = 0; col < w / tile; col += 1) {
      const tx = x + col * tile;
      const ty = y + row * tile;
      const tone = Math.floor(random() * 17);
      fill(ctx, tx, ty, tile - 1, tile - 1, cool ? `rgb(${42 + tone} ${60 + tone} ${69 + tone})` : `rgb(${61 + tone} ${64 + tone} ${58 + tone})`);
      ctx.strokeStyle = cool ? '#b7c7cb12' : '#ffebc321';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      const a = random() * 13;
      ctx.moveTo(tx, ty + a);
      ctx.bezierCurveTo(tx + 19, ty + a + 4, tx + 12, ty + a + 23, tx + tile - 1, ty + a + 22);
      ctx.stroke();
      for (let n = 0; n < 11; n += 1) fill(ctx, tx + random() * tile, ty + random() * tile, random() * 3 + 0.4, 0.6, random() < 0.5 ? '#05081020' : '#fff4d718');
    }
  }
  const wash = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
  wash.addColorStop(0, '#07121f70');
  wash.addColorStop(0.42, '#ffffff00');
  wash.addColorStop(1, '#080d16a1');
  fill(ctx, x, y, w, h, wash);
  ctx.restore();
}

function frame(ctx, x, y, w, h, outer = '#aa87596e', inner = '#b9955c33') {
  ctx.strokeStyle = outer;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = inner;
  ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
  for (const dx of [0, w]) for (const dy of [0, h]) {
    ctx.save();
    ctx.translate(x + dx, y + dy);
    ctx.scale(dx ? -1 : 1, dy ? -1 : 1);
    path(ctx, [[0, 17], [0, 0], [17, 0], [12, 5], [5, 5], [5, 12], [0, 17]], outer);
    ctx.restore();
  }
}

function diamond(ctx, x, y, rx, ry, stroke, paint = null) {
  path(ctx, [[x, y - ry], [x + rx, y], [x, y + ry], [x - rx, y], [x, y - ry]], paint, stroke);
}

function foyerInlay(ctx) {
  const x = 596;
  const y = 362;
  ellipse(ctx, x, y, 106, 88, '#141d2347', '#b3986559');
  ellipse(ctx, x, y, 97, 80, null, '#b99a6a8a');
  ellipse(ctx, x, y, 73, 64, null, '#b99a6a57');
  for (let i = 0; i < 32; i += 1) {
    const a = TAU * i / 32;
    const inner = i % 4 === 0 ? 77 : 91;
    path(ctx, [[x + Math.cos(a) * inner, y + Math.sin(a) * inner * 0.83], [x + Math.cos(a) * 101, y + Math.sin(a) * 84]], null, '#b79a646d', i % 4 === 0 ? 2 : 1);
  }
  diamond(ctx, x, y - 5, 41, 44, '#c4a4729c');
  diamond(ctx, x, y - 5, 31, 33, '#c4a4728c');
  for (let i = 0; i < 7; i += 1) {
    const dy = i * 5;
    path(ctx, [[x - 24 + i * 3.45, y - 19 + dy], [x, y - 5 + dy], [x + 24 - i * 3.45, y - 19 + dy]], null, '#e2bc7dba');
  }
  type(ctx, 'V E S P E R', x, y + 50, 10, '#d5b687a7', 'center');
  type(ctx, 'P R I V A T E   B A N K', x, y - 52, 9, '#d5b687b0', 'center');
}

function vaultInlay(ctx) {
  const x = 1114;
  const y = 285;
  for (const [r, color] of [[92, '#34858e63'], [79, '#a9f2df69'], [66, '#59c6be79'], [44, '#a3f9e470']]) {
    ellipse(ctx, x, y, r, r, null, color);
  }
  for (let i = 0; i < 24; i += 1) {
    const angle = i * TAU / 24;
    const radii = i % 3 === 0 ? [70, 88] : [83, 88];
    path(ctx, radii.map(r => [x + r * Math.cos(angle), y + r * Math.sin(angle)]), null, '#9ee4d177');
  }
  for (const offset of [-1, 1]) {
    diamond(ctx, x + offset * 68, y, 9, 13, '#76b4ac');
    diamond(ctx, x, y + offset * 67, 13, 9, '#76b4ac');
  }
}

function zoneLabel(ctx, kicker, title, x, y, align = 'left', cool = false) {
  type(ctx, kicker, x, y, 10, cool ? '#9bdbd5' : '#d4ad72', align);
  type(ctx, title, x, y + 17, 19, cool ? '#d7efed' : '#ece0cb', align, 'Georgia, Times New Roman, serif', 500);
}

function corridors(ctx) {
  for (const [x, y] of [[215, 278], [215, 511], [917, 516]]) {
    const paint = ctx.createLinearGradient(x - 17, y, x + 31, y);
    paint.addColorStop(0, '#eab76007');
    paint.addColorStop(0.5, '#eab76042');
    paint.addColorStop(1, '#eab76007');
    fill(ctx, x - 17, y, 48, y === 278 ? 89 : 61, paint);
    fill(ctx, x + 5, y + 2, 1, y === 278 ? 85 : 57, '#e4ba7669');
  }
  frame(ctx, 244, 137, 656, 459);
  frame(ctx, 270, 174, 608, 283, '#bc9a6b53', '#aa926045');
  frame(ctx, 946, 140, 282, 291, '#95d4ca8a', '#99bcb859');
  frame(ctx, 48, 140, 158, 242, '#8c978758', '#8b876842');
  frame(ctx, 48, 420, 157, 179, '#829b9f67', '#60818638');
  frame(ctx, 535, 498, 240, 73, '#8bb7ae7a', '#698c7f59');
  zoneLabel(ctx, 'SERVICE ACCESS', 'Records', 56, 145);
  zoneLabel(ctx, 'B-02  /  ENTRY', 'Service Tunnels', 57, 426, 'left', true);
  zoneLabel(ctx, 'VESPER PRIVATE BANK', 'Grand Banking Hall', 594, 149, 'center');
  zoneLabel(ctx, 'RESTRICTED  /  B-02', 'The Black Vault', 1114, 145, 'center', true);
  zoneLabel(ctx, 'SERVICE EXIT', 'Getaway Bay', 951, 478, 'left', true);
  type(ctx, 'SURVEILLANCE WING', 652, 513, 10, '#acd3c7', 'center');
  for (let i = 0; i < 7; i += 1) {
    const x = 963 + i * 19;
    path(ctx, [[x, 571], [x + 10, 565], [x + 10, 570], [x, 577], [x - 10, 570], [x - 10, 565]], '#d0ac6530');
  }
  ctx.setLineDash([11, 8]);
  path(ctx, [[939, 594], [1228, 594]], null, '#cfac666d');
  ctx.setLineDash([]);
}

function wallTop(ctx, box) {
  const { x, y, w, h, style } = box;
  fill(ctx, x + 4, y + 5, w + 2, h + 9, '#060b12a8');
  fill(ctx, x, y, w, h, '#141b21');
  fill(ctx, x, y, w, 2, '#b09160d4');
  fill(ctx, x, y + h - 3, w, 2, '#735e47');
  if (style === 'windows') {
    for (let wx = 45; wx < 1232; wx += 47) {
      fill(ctx, wx, y + 3, 39, 8, '#364d59');
      fill(ctx, wx + 2, y + 3, 34, 2, '#90c0bf8c');
      fill(ctx, wx + 38, y + 2, 2, 9, '#c7a577a8');
    }
  } else if (w < h) {
    fill(ctx, x + 3, y + 4, 3, h - 7, '#4d504d');
    fill(ctx, x + w - 3, y + 4, 2, h - 7, '#6d5944');
    for (let wy = y + 15; wy < y + h - 8; wy += 26) fill(ctx, x + 4, wy, w - 8, 1, '#b69b6770');
  }
}

function furnitureShadow(ctx, box) {
  const { x, y, w, h } = box;
  const paint = ctx.createLinearGradient(x + w, y + h, x + w + 31, y + h + 38);
  paint.addColorStop(0, '#080c13a5');
  paint.addColorStop(1, '#080c1310');
  path(ctx, [[x, y + h - 4], [x + w - 3, y + 4], [x + w + 31, y + 38], [x + w + 35, y + h + 31], [x + 26, y + h + 34]], paint);
}

function pillar(ctx, x, y, w, h) {
  const cut = 7;
  const octagon = (inset, dy) => [[x + cut, y + inset + dy], [x + w - cut, y + inset + dy], [x + w - inset, y + cut + dy], [x + w - inset, y + h - cut + dy], [x + w - cut, y + h - inset + dy], [x + cut, y + h - inset + dy], [x + inset, y + h - cut + dy], [x + inset, y + cut + dy]];
  path(ctx, octagon(0, 5), '#131b22', '#3d413d');
  path(ctx, octagon(0, 0), '#887d65', '#bba37f');
  const surface = ctx.createLinearGradient(x, y, x + w, y + h);
  surface.addColorStop(0, '#ddd0a7');
  surface.addColorStop(0.40, '#a3a18a');
  surface.addColorStop(1, '#494a43');
  path(ctx, octagon(4, 0), surface, '#edd2a4');
  ellipse(ctx, x + w / 2, y + h / 2, w * 0.30, h * 0.30, '#2f3936', '#e2c895');
  ellipse(ctx, x + w / 2, y + h / 2, w * 0.23, h * 0.23, surface, '#615c49');
  path(ctx, [[x + w * 0.29, y + h * 0.44], [x + w * 0.51, y + h * 0.33], [x + w * 0.67, y + h * 0.39]], null, '#e8debcaa');
}

function fixtures(ctx, box) {
  const { x, y, w, h, style } = box;
  if (style === 'pillar') { pillar(ctx, x, y, w, h); return; }
  if (style === 'pedestal') return;
  if (style === 'car') return;
  fill(ctx, x, y + 5, w, h, '#14171a');
  const surface = ctx.createLinearGradient(x, y, x, y + h);
  surface.addColorStop(0, style === 'glass' ? '#345958' : style === 'desk' ? '#645044' : '#424b4b');
  surface.addColorStop(1, style === 'glass' ? '#193433' : style === 'desk' ? '#332b25' : '#262d30');
  fill(ctx, x, y, w, h, surface);
  frame(ctx, x, y, w, h, style === 'glass' ? '#84bab3b8' : '#be9868af', '#d7b47f45');
  if (style === 'glass') {
    fill(ctx, x + 5, y + 2, w - 10, 2, '#a7f4dc');
    for (let dx = 13; dx < w - 10; dx += 20) {
      path(ctx, [[x + dx, y + 6], [x + dx + 11, y + 6], [x + dx + 3, y + h - 5], [x + dx - 5, y + h - 5]], '#d4fbf02b');
    }
    for (const dx of [5, w - 7]) fill(ctx, x + dx, y - 2, 3, h + 6, '#b8a373');
  } else if (style === 'desk' || style === 'monitors') {
    const count = style === 'desk' ? 2 : 4;
    for (let i = 0; i < count; i += 1) {
      const mx = x + 9 + i * (w - 18) / count;
      fill(ctx, mx, y + 7, 16, 10, '#111821');
      fill(ctx, mx + 2, y + 8, 12, 6, '#458b82');
      fill(ctx, mx + 2, y + 20, 12, 2, '#c1aa87a2');
    }
    if (style === 'desk') {
      fill(ctx, x + 78, y + 9, 17, 12, '#dbcdb0');
      for (let i = 0; i < 3; i += 1) fill(ctx, x + 81, y + 12 + 3 * i, 10, 1, '#756955');
    }
  } else {
    for (let dx = 9; dx < w - 8; dx += 16) {
      fill(ctx, x + dx, y + 3, 1, h - 7, '#171d1f');
      fill(ctx, x + dx + 3, y + h * 0.49, 7, 2, '#d4ad77');
    }
  }
}

export function drawCar(ctx, box, travel) {
  const { x, y, w, h } = box;
  const middle = x + w / 2;
  ctx.save();
  ctx.translate(0, y * 2 + h + travel);
  ctx.scale(1, -1);
  for (const dx of [-2, w - 5]) for (const dy of [14, h - 28]) fill(ctx, x + dx, y + dy, 7, 17, '#080d13');
  const coat = ctx.createLinearGradient(x, y, x + w, y);
  coat.addColorStop(0, '#10262e');
  coat.addColorStop(0.30, '#49717a');
  coat.addColorStop(0.54, '#254953');
  coat.addColorStop(1, '#122631');
  path(ctx, [[x + 6, y + 3], [x + w - 6, y + 3], [x + w - 1, y + 18], [x + w - 1, y + h - 12], [x + w - 8, y + h - 3], [x + 8, y + h - 3], [x + 1, y + h - 12], [x + 1, y + 18]], coat, '#91bab9', 1.6);
  path(ctx, [[x + 7, y + 26], [x + w - 7, y + 26], [x + w - 10, y + 39], [x + 10, y + 39]], '#0b1822', '#8ab1ad');
  path(ctx, [[x + 10, y + 60], [x + w - 10, y + 60], [x + w - 8, y + 71], [x + 8, y + 71]], '#0b1822', '#6c9092');
  fill(ctx, middle - 1, y + 6, 2, 16, '#769599');
  fill(ctx, x + 5, y + 7, 10, 3, '#f5d783');
  fill(ctx, x + w - 15, y + 7, 10, 3, '#f5d783');
  fill(ctx, x + 7, y + h - 10, 9, 3, '#ea5e5e');
  fill(ctx, x + w - 16, y + h - 10, 9, 3, '#ea5e5e');
  ctx.restore();
}

export function paintArchitecture(canvas, foreground) {
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  const ctx = canvas.getContext('2d');
  foreground.width = VIEW.width;
  foreground.height = VIEW.height;
  const top = foreground.getContext('2d');
  fill(ctx, 0, 0, VIEW.width, VIEW.height, '#0b111a');
  ctx.strokeStyle = '#473c2d';
  ctx.strokeRect(BANK.x - 7, BANK.y - 7, BANK.w + 14, BANK.h + 14);
  fill(ctx, BANK.x, BANK.y, BANK.w, BANK.h, '#15212b');
  marble(ctx, 40, 126, 177, 268, true, 24);
  marble(ctx, 40, 402, 177, 213, true, 71);
  marble(ctx, 215, 126, 716, 488, false, 52);
  marble(ctx, 931, 126, 310, 321, true, 99);
  marble(ctx, 931, 454, 310, 161, true, 20);
  ctx.save();
  ctx.beginPath();
  ctx.rect(41, 128, 1199, 485);
  ctx.clip();
  for (const x of [112, 332, 502, 691, 864]) {
    glow(ctx, x, 190, 157, '#dbaa6e35');
    path(ctx, [[x - 19, 126], [x + 15, 126], [x + 80, 279], [x + 48, 292]], '#e6bf8711');
  }
  glow(ctx, 1114, 286, 146, '#42e0df3d');
  glow(ctx, 1180, 588, 117, '#56c2bd2a');
  glow(ctx, 633, 549, 100, '#7af7dd26');
  foyerInlay(ctx);
  vaultInlay(ctx);
  corridors(ctx);
  for (const box of COVERS) furnitureShadow(ctx, box);
  ctx.restore();
  for (const box of ARCHITECTURE) wallTop(top, box);
  for (const box of COVERS) fixtures(top, box);
  const vignette = ctx.createRadialGradient(645, 340, 220, 645, 340, 675);
  vignette.addColorStop(0, '#060b1000');
  vignette.addColorStop(1, '#06091077');
  fill(ctx, BANK.x, BANK.y, BANK.w, BANK.h, vignette);
}
