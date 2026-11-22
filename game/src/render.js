import { BANK, CARD_GATE, COVERS, STATIONS, VAULT_GATE, VIEW } from './level.js';
import { clamp, conePolygon, TAU } from './geometry.js';
import { drawCar, ellipse, fill, glow, MINT, paintArchitecture, path, type } from './architecture.js';

const CREAM = '#f5eadd';
const PINK = '#ff737c';
const GETAWAY_CAR = COVERS.find(box => box.style === 'car');
const SIGHT = {
  camera: { near: '#58e5dc3d', far: '#58e5dc11', edge: '#90efe387' },
  patrol: { near: '#ffd49762', far: '#ffd49715', edge: '#ffdb9f9c' },
  suspect: { near: '#ffc5667b', far: '#ffb13b29', edge: '#ffd371c9' },
  alert: { near: '#ff495d84', far: '#ff495d25', edge: '#ff768ace' },
};

function vision(ctx, observer, blocks, palette, time, camera = false) {
  const points = conePolygon(observer, blocks);
  const [x, y] = [observer.x, observer.y];
  const fillPaint = ctx.createRadialGradient(x, y, 3, x, y, observer.range);
  fillPaint.addColorStop(0, palette.near);
  fillPaint.addColorStop(1, palette.far);
  ctx.save();
  path(ctx, [[x, y], ...points, [x, y]], fillPaint, palette.edge, camera ? 1 : 1.2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(observer.angle);
  const shift = time * (camera ? 46 : 26) % 16;
  for (let r = 16 + shift; r < observer.range + 16; r += 16) fill(ctx, r, -observer.range / 2, 1, observer.range, camera ? '#b0fff318' : '#ffe5c012');
  if (camera) {
    ctx.setLineDash([4, 6]);
    path(ctx, [[11, 0], [observer.range, 0]], null, '#a6ffee70');
  }
  ctx.restore();
}

function drawCamera(ctx, camera, time) {
  const jammed = time < camera.jammed;
  const live = !camera.offline && !jammed;
  const color = camera.visual > 0 ? PINK : live ? MINT : '#829d9f';
  const { x, y } = camera;
  ellipse(ctx, x + 3, y + 7, 10, 7, '#070e16b0');
  ellipse(ctx, x, y, 9, 9, '#263b45', '#9badae');
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(camera.angle);
  path(ctx, [[-8, -6], [7, -6], [10, -3], [10, 3], [7, 6], [-8, 6]], '#c5d6cc', '#10202b', 1.4);
  path(ctx, [[-7, -4], [6, -4], [6, 2], [-7, 2]], '#455d63');
  fill(ctx, 5, -3, 7, 6, '#10212a');
  fill(ctx, 9, -2, 3, 4, color);
  ctx.restore();
  const caption = jammed ? 'JAMMED' : camera.offline ? 'OFFLINE' : `CAM ${camera.id}`;
  fill(ctx, x - 25, y - 23, 50, 12, '#0c1722e8');
  fill(ctx, x - 25, y - 23, 2, 12, color);
  type(ctx, caption, x + 1, y - 17, 8.5, color, 'center');
  if (live && Math.sin(time * 5 + x) > -0.75) glow(ctx, x, y, 16, '#75f7db31');
}

function drawLaser(ctx, beam, time) {
  const { x1, y1, x2, y2 } = beam;
  const lit = beam.powered || (beam.warning && Math.sin(time * 49) > 0);
  for (const [x, y] of [[x1, y1], [x2, y2]]) {
    fill(ctx, x - 4, y - 3, 8, 7, '#202a34');
    fill(ctx, x - 2, y - 1, 4, 3, lit ? '#ffbbb0' : '#88636b');
    if (lit) glow(ctx, x, y, 13, '#ff365a77');
  }
  if (lit) {
    path(ctx, [[x1, y1], [x2, y2]], null, '#f9335860', 8 + Math.sin(time * 14) * 1.6);
    path(ctx, [[x1, y1], [x2, y2]], null, '#fb4a6c96', 3.2);
    path(ctx, [[x1, y1], [x2, y2]], null, '#ffb8bb', 0.95);
  } else {
    ctx.setLineDash([2, 8]);
    path(ctx, [[x1, y1], [x2, y2]], null, '#ee7a8349');
    ctx.setLineDash([]);
  }
}

function motionSensor(ctx, sensor, time, off) {
  if (off) return;
  const alpha = Math.round(38 + Math.sin(time * 3) * 16).toString(16).padStart(2, '0');
  ctx.setLineDash([3, 5]);
  ellipse(ctx, sensor.x, sensor.y, sensor.radius, sensor.radius, '#f2b75a12', `#ffc373${alpha}`);
  ctx.setLineDash([]);
  ellipse(ctx, sensor.x, sensor.y, 5, 5, '#1f282c', '#f8bf73');
  type(ctx, 'MOTION', sensor.x, sensor.y + 19, 8, '#e5bb82', 'center');
}

function vaultGate(ctx, open) {
  const { x, y, w, h } = VAULT_GATE;
  fill(ctx, x - 7, y - 2, w + 14, h + 4, open ? '#b3ede53a' : '#5e452f');
  for (const cap of [y - 5, y + h - 1]) {
    fill(ctx, x - 8, cap, w + 16, 7, '#b99869');
    fill(ctx, x - 5, cap + 2, w + 10, 3, '#685341');
  }
  if (open) return;
  const plate = ctx.createLinearGradient(x - 4, y, x + w + 4, y);
  plate.addColorStop(0, '#393d40');
  plate.addColorStop(0.25, '#d7b488');
  plate.addColorStop(0.52, '#705641');
  plate.addColorStop(1, '#211e24');
  fill(ctx, x, y, w, h, plate);
  for (let i = 0; i < 5; i += 1) fill(ctx, x + 2, y + 6 + i * 15, w - 4, 2, '#f2d09280');
  ellipse(ctx, x + w / 2, y + h / 2, 11, 11, '#2a2727', '#ecc997', 2);
  for (let a = 0; a < TAU; a += TAU / 6) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    path(ctx, [[cx, cy], [cx + Math.cos(a) * 9, cy + Math.sin(a) * 9]], null, '#d6ad7c');
  }
  ellipse(ctx, x + w / 2, y + h / 2, 3, 3, '#fcdfac');
}

function keycardGate(ctx, closed) {
  const { x, y, w, h } = CARD_GATE;
  fill(ctx, x - 4, y, w + 8, h, closed ? '#141e26' : '#7cc8b035');
  for (const top of [y, y + h - 4]) fill(ctx, x - 3, top, w + 6, 4, '#a89470');
  if (closed) {
    fill(ctx, x + 3, y + 6, w - 6, h - 12, '#405260');
    fill(ctx, x + 5, y + 7, 1, h - 14, '#bbab88');
    fill(ctx, x + 8, y + h / 2 - 4, 2, 8, '#f07b81');
  } else fill(ctx, x + w / 2, y + 6, 1, h - 12, '#b9f8d7a5');
}

function diamondDisplay(ctx, mission, time) {
  const { x, y } = STATIONS.diamond;
  const outer = [[x - 18, y - 14], [x - 12, y - 19], [x + 13, y - 19], [x + 19, y - 12], [x + 19, y + 12], [x + 12, y + 18], [x - 12, y + 18], [x - 18, y + 12]];
  path(ctx, outer, '#203c44', '#e1c48c', 1.5);
  ellipse(ctx, x, y, 13, 13, '#081d27', '#67978a');
  if (!mission.hasDiamond) {
    const gy = y - 8 + Math.sin(time * 2.8) * 3;
    glow(ctx, x, gy, 53, '#61ffed65');
    glow(ctx, x, gy, 29, '#85ffeb73');
    path(ctx, [[x - 14, gy - 3], [x - 7, gy - 10], [x + 7, gy - 10], [x + 14, gy - 3], [x, gy + 13]], '#73e6e0', '#e8fff4', 1.4);
    path(ctx, [[x - 14, gy - 3], [x - 5, gy - 3], [x, gy + 13]], '#42aaa8');
    path(ctx, [[x + 14, gy - 3], [x + 5, gy - 3], [x, gy + 13]], '#4384a1');
    path(ctx, [[x - 5, gy - 3], [x, gy - 10], [x + 5, gy - 3], [x, gy + 13]], '#adfff4', '#effff8');
    path(ctx, [[x - 14, gy - 3], [x + 14, gy - 3]], null, '#fffde7');
    for (let i = 0; i < 3; i += 1) {
      const a = i * 2.5 + 1;
      const spark = 2 + (1 + Math.sin(time * 3 + i * 2)) * 2;
      const sx = x + Math.cos(a) * (21 + i * 4);
      const sy = gy + Math.sin(a) * (20 + i * 3);
      path(ctx, [[sx - spark, sy], [sx + spark, sy]], null, '#d6fff2');
      path(ctx, [[sx, sy - spark], [sx, sy + spark]], null, '#d6fff2');
    }
  }
  const label = mission.hasDiamond ? 'DISPLAY EMPTY' : 'MIDNIGHT DIAMOND';
  fill(ctx, x - 65, y + 49, 130, 21, '#091923ed');
  fill(ctx, x - 65, y + 49, 130, 1, mission.hasDiamond ? '#8f8e81' : MINT);
  type(ctx, label, x, y + 60, 10.5, mission.hasDiamond ? '#a7aaa0' : '#d2fff3', 'center');
}

function useStations(ctx, mission, time) {
  for (const id of ['credential', 'relay', 'lock', 'exit']) {
    const station = STATIONS[id];
    const { x, y } = station;
    const active = mission.objective === id;
    const done = (id === 'credential' && mission.objective !== 'credential') ||
      (id === 'relay' && mission.security.blackout) || (id === 'lock' && mission.gateOpen);
    const light = active ? MINT : done ? '#72ad9c' : '#d4a969';
    if (id !== 'exit') {
      fill(ctx, x - 10, y - 8, 21, 16, '#0d1922');
      fill(ctx, x - 9, y - 8, 19, 2, '#b4936b');
      fill(ctx, x - 6, y - 4, 12, 7, active ? '#3e9a8c' : '#396361');
      fill(ctx, x - 4, y - 3, 7 + Math.floor((time + x) % 1 * 3), 1, light);
      if (id === 'credential' && !done) fill(ctx, x - 4, y - 3, 9, 5, '#e7c983');
    }
    if (active) {
      const r = 17 + (time * 19 % 12);
      glow(ctx, x, y, 30, '#83ecbc40');
      ctx.globalAlpha = 1 - (r - 16) / 15;
      ellipse(ctx, x, y, r, r, null, MINT, 1);
      ctx.globalAlpha = 1;
      path(ctx, [[x - 5, y - 26], [x, y - 31], [x + 5, y - 26], [x, y - 20]], MINT, '#0d2630');
    }
    if (id !== 'exit') type(ctx, station.label, id === 'lock' ? x - 14 : x, y + 19, 9.5, active ? '#d5fff3' : '#cbb58f', 'center');
  }
}

function figure(ctx, actor, player, time, mission) {
  const { x, y } = actor;
  const stride = actor.motion > 0.02 ? Math.sin(actor.progress / (player ? 8 : 7.5)) * 6 : 0;
  const caught = actor.mode === 'ALERT';
  const suspicious = ['SUSPICIOUS', 'INVESTIGATE', 'SEARCH'].includes(actor.mode);
  const accent = player ? '#f4e6c8' : caught ? PINK : suspicious ? '#ffcf79' : '#dba35f';
  const jacket = player ? '#244d61' : caught ? '#702b39' : '#5c483c';
  const sneaking = player && actor.stance === 'crouch';
  if (player) {
    glow(ctx, x, y + 2, 29, '#98e7d14e');
    ellipse(ctx, x, y + 4, 15, 10, '#102b3082', '#aef0dcb0');
    if (actor.motion > 0.02) {
      const spacing = actor.stance === 'sprint' ? 8 : 5.5;
      for (let step = 0; step < 4; step += 1) {
        const gap = 14 + step * spacing + actor.progress % spacing;
        const side = step % 2 ? -4 : 4;
        const fx = x - Math.cos(actor.angle) * gap - Math.sin(actor.angle) * side;
        const fy = y - Math.sin(actor.angle) * gap + Math.cos(actor.angle) * side;
        ctx.globalAlpha = 0.40 - step * 0.08;
        ellipse(ctx, fx, fy + 3, 1.7, 1.15, '#bdeddf');
      }
      ctx.globalAlpha = 1;
    }
  }
  ellipse(ctx, x + 7, y + 9, 13, 6, '#070d16a6');
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(actor.angle);
  path(ctx, [[-5 + stride * 0.6, -5], [-14 + stride, -6], [-17 + stride, -3], [-7 + stride * 0.6, -1]], '#141d25', accent, 0.55);
  path(ctx, [[-4 - stride * 0.6, 3], [-14 - stride, 3], [-17 - stride, 6], [-6 - stride * 0.6, 7]], '#141d25', accent, 0.55);
  const shoulder = sneaking ? 8 : 10;
  path(ctx, [[7, -7], [1, -shoulder], [-6, -shoulder], [-11, -5], [-11, 5], [-5, shoulder], [1, shoulder], [7, 6]], jacket, accent, player ? 1.35 : 1);
  path(ctx, [[-8, -6], [-3, -6], [0, 5], [-6, 8]], player ? '#121e2a' : '#30252a');
  path(ctx, [[-6, -7], [-2, -7], [1, 7]], null, player ? MINT : '#bd9b6b', 1.05);
  ellipse(ctx, 4, 0, 6.6, sneaking ? 4.7 : 6.05, player ? '#152936' : '#2d252e', accent, 0.85);
  path(ctx, [[7, -4], [10, -2], [10, 2], [7, 4]], player ? '#a7dedb' : '#c8aa8b');
  if (player) {
    path(ctx, [[-5, 5], [-13, 5], [-13, -1], [-7, -1]], '#b08154', '#e9c18a', 0.7);
    path(ctx, [[11, -2], [15, 0], [11, 2]], MINT);
  } else {
    fill(ctx, 2, -9, 6, 2, '#e3c399');
    fill(ctx, 8, -2, 3, 4, caught ? '#ff909b' : '#ecbb78');
  }
  ctx.restore();
  const caption = player ? (mission.hasDiamond ? 'DIAMOND SECURED' : 'THIEF') : suspicious || caught ? actor.mode : `GUARD ${actor.id}`;
  const width = Math.max(45, caption.length * 6.25 + 12);
  const top = y - 29;
  fill(ctx, x - width / 2, top, width, 14, '#0c151ce8');
  fill(ctx, x - width / 2, top, width, 1, player ? MINT : accent);
  type(ctx, caption, x, top + 7.5, 9.5, player ? '#d4fff0' : accent, 'center');
  if (player && (actor.stance === 'sprint' || mission.noise)) {
    const radius = 20 + (time * 40 % 28);
    ellipse(ctx, x, y, radius, radius, null, '#ebcc8445');
  }
  if (!player && actor.awareness > 0.1) {
    fill(ctx, x - 10, y + 15, 20, 2, '#25222a');
    fill(ctx, x - 10, y + 15, 20 * actor.awareness, 2, accent);
  }
}

function extractionLights(ctx, time, travel) {
  const light = 0.75 + Math.sin(time * 6) * 0.12;
  ctx.save();
  ctx.globalAlpha = light;
  const front = 583 + travel;
  const cast = ctx.createLinearGradient(1179, front, 1179, front + 43);
  cast.addColorStop(0, '#efe5a3b7');
  cast.addColorStop(1, '#e9e6b500');
  for (const x of [1168, 1195]) {
    path(ctx, [[x - 4, front], [x + 4, front], [x + 16, front + 43], [x - 16, front + 43]], cast);
    glow(ctx, x, front, 13, '#faffbf9c');
  }
  for (let i = 0; i < 7; i += 1) {
    const x = 961 + i * 19;
    const strength = Math.round(110 + Math.sin(i * 0.68 - time * 9) * 89).toString(16).padStart(2, '0');
    path(ctx, [[x - 5, 571], [x + 5, 571], [x + 10, 577], [x, 577]], `#f6cf7b${strength}`);
  }
  ctx.restore();
}

function effects(ctx, mission, time, travel) {
  for (let n = 0; n < 85; n += 1) {
    const x = BANK.x + ((n * 139.37 + time * (13 + n % 7)) % BANK.w);
    const y = 106 + ((n * 7.71 + time * 68) % 21);
    path(ctx, [[x, y], [x - 4, y + 8]], null, n % 9 === 0 ? '#b2c7d475' : '#7595a640');
  }
  for (let n = 0; n < 26; n += 1) {
    const x = 949 + ((n * 111.4 + time * 22) % 283);
    const y = 468 + ((n * 57.3 + time * 91) % 141);
    path(ctx, [[x, y], [x - 2, y + 5]], null, '#a4d3de28');
  }
  for (let i = 0; i < 4; i += 1) {
    const x = 595 + i * 19;
    const activity = Math.floor(time * 4 + i * 3) % 5;
    fill(ctx, x, 588, 8 + activity, 1, '#9ce1bc');
  }
  if (mission.decoy) {
    const decoy = mission.decoy;
    const t = clamp(decoy.age / 0.34, 0, 1);
    const x = decoy.fromX + t * (decoy.x - decoy.fromX);
    const y = decoy.fromY + t * (decoy.y - decoy.fromY) - Math.sin(t * Math.PI) * 34;
    if (t >= 1) {
      const r = 9 + ((decoy.age - 0.34) * 83 % 65);
      ellipse(ctx, x, y, r, r, null, '#f7cf8cb0');
      ellipse(ctx, x, y, r * 0.6, r * 0.6, null, '#f7cf8c60');
    }
    glow(ctx, x, y, 23, '#ffcc6384');
    ellipse(ctx, x, y, 4, 3, '#ffe19d', '#fff0bb');
  }
  if (mission.pulse && time < mission.pulse.time + 0.8) {
    const pulse = mission.pulse;
    const t = (time - pulse.time) / 0.8;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ellipse(ctx, pulse.x, pulse.y, 12 + t * pulse.radius, 12 + t * pulse.radius, null, MINT, 2);
    ctx.restore();
  }
  if (mission.hasDiamond) extractionLights(ctx, time, travel);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const floor = document.createElement('canvas');
  const fixtures = document.createElement('canvas');
  paintArchitecture(floor, fixtures);
  let scale = 0;

  function draw(mission, options = {}) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const next = Math.max(0.5, Math.min(1.5, canvas.clientWidth / VIEW.width * ratio));
    if (Math.abs(next - scale) > 0.001) {
      scale = next;
      canvas.width = Math.round(VIEW.width * scale);
      canvas.height = Math.round(VIEW.height * scale);
    }
    ctx.setTransform(canvas.width / VIEW.width, 0, 0, canvas.height / VIEW.height, 0, 0);
    ctx.drawImage(floor, 0, 0);
    const time = mission.time;
    const carTravel = 137 * (options.departure ?? 0) ** 1.55;
    ctx.save();
    ctx.beginPath();
    ctx.rect(BANK.x, BANK.y, BANK.w, BANK.h);
    ctx.clip();
    motionSensor(ctx, mission.security.sensor, time, mission.security.blackout);
    for (const camera of mission.security.cameras) if (!camera.offline && time >= camera.jammed) {
      vision(ctx, camera, mission.blocks, camera.visual > 0 ? SIGHT.alert : SIGHT.camera, time, true);
    }
    for (const guard of mission.guards) {
      const color = guard.mode === 'ALERT' ? SIGHT.alert : guard.awareness > 0.17 ? SIGHT.suspect : SIGHT.patrol;
      vision(ctx, guard, mission.blocks, color, time);
    }
    ctx.drawImage(fixtures, 0, 0);
    drawCar(ctx, GETAWAY_CAR, carTravel);
    keycardGate(ctx, mission.objective === 'credential');
    vaultGate(ctx, mission.gateOpen);
    for (const beam of mission.security.lasers) drawLaser(ctx, beam, time);
    effects(ctx, mission, time, carTravel);
    diamondDisplay(ctx, mission, time);
    useStations(ctx, mission, time);
    for (const camera of mission.security.cameras) drawCamera(ctx, camera, time);
    for (const guard of mission.guards) figure(ctx, guard, false, time, mission);
    if (!options.title && mission.status !== 'victory') figure(ctx, mission.player, true, time, mission);
    if (options.aim && !mission.lock) {
      const x = options.aim.x;
      const y = options.aim.y;
      ellipse(ctx, x, y, 7, 7, null, '#c0dcccaa');
      path(ctx, [[x - 3, y], [x + 3, y]], null, CREAM);
      path(ctx, [[x, y - 3], [x, y + 3]], null, CREAM);
    }
    if (mission.security.trace > 62 || mission.hasDiamond) {
      const warning = ctx.createLinearGradient(0, BANK.y, 0, BANK.y + 45);
      const strength = mission.security.trace > 62 ? 0.37 : 0.17;
      warning.addColorStop(0, `rgba(245,39,70,${strength + Math.sin(time * 9) * 0.06})`);
      warning.addColorStop(1, 'transparent');
      fill(ctx, BANK.x, BANK.y, BANK.w, 45, warning);
    }
    ctx.restore();
  }
  return { draw };
}
