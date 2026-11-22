import { GUARD_POSTS } from './level.js';
import { angleBetween, angleDelta, clamp, coneExposure, distance, lineClear, slide, solidAt } from './geometry.js';

const SPEED = { PATROL: 57, INVESTIGATE: 83, ALERT: 127, SEARCH: 72, RETURN: 77 };
const NAV_STEP = 17;
const NAV_COLS = 75;
const NAV_ROWS = 43;
const SEARCH_TURNS = [1.01, -1.46, 2.1];

export function createGuards() {
  return GUARD_POSTS.map(post => ({
    ...post, x: post.route[0][0], y: post.route[0][1], radius: 10, range: 205, fov: 1.02,
    angle: post.facing, mode: post.offset ? 'PAUSE' : 'PATROL', timer: post.offset,
    awareness: 0, routeIndex: 1, progress: 0, motion: 0, visual: 0,
    target: null, lastSeen: null, lost: 0, nav: null, navAge: 0, heard: -10,
  }));
}

const nodePoint = id => ({ x: (id % NAV_COLS) * NAV_STEP + 8, y: Math.floor(id / NAV_COLS) * NAV_STEP + 8 });

function nearestNode(point, blocks, radius) {
  const col = Math.round((point.x - 8) / NAV_STEP);
  const row = Math.round((point.y - 8) / NAV_STEP);
  let nearest = -1;
  let closest = Infinity;
  for (let y = row - 2; y <= row + 2; y += 1) {
    for (let x = col - 2; x <= col + 2; x += 1) {
      if (x < 1 || x >= NAV_COLS - 1 || y < 1 || y >= NAV_ROWS - 1) continue;
      const id = y * NAV_COLS + x;
      const candidate = nodePoint(id);
      const gap = distance(point, candidate);
      if (gap >= closest || solidAt(candidate.x, candidate.y, radius, blocks) || !lineClear(point, candidate, blocks)) continue;
      closest = gap;
      nearest = id;
    }
  }
  return nearest;
}

function planPath(guard, goal, blocks) {
  const radius = guard.radius + 1;
  const start = nearestNode(guard, blocks, radius);
  const end = nearestNode(goal, blocks, radius);
  if (start < 0 || end < 0) return [];
  const open = [{ id: start, cost: 0, score: 0 }];
  const costs = new Map([[start, 0]]);
  const parents = new Map();
  const endPoint = nodePoint(end);
  const steps = [-NAV_COLS, -1, 1, NAV_COLS];
  while (open.length) {
    let best = 0;
    for (let i = 1; i < open.length; i += 1) if (open[i].score < open[best].score) best = i;
    const { id, cost } = open.splice(best, 1)[0];
    if (id === end) {
      const path = [];
      for (let current = end; current !== start; current = parents.get(current)) path.push(nodePoint(current));
      const first = nodePoint(start);
      if (distance(guard, first) > 4) path.push(first);
      path.reverse();
      path.push(goal);
      return path;
    }
    if (cost > costs.get(id)) continue;
    const from = nodePoint(id);
    for (const jump of steps) {
      const next = id + jump;
      if (next < NAV_COLS || next >= NAV_COLS * (NAV_ROWS - 1) || next % NAV_COLS === 0 || next % NAV_COLS === NAV_COLS - 1) continue;
      const point = nodePoint(next);
      if (cost + 1 >= (costs.get(next) ?? Infinity) || solidAt(point.x, point.y, radius, blocks) || !lineClear(from, point, blocks, guard.radius)) continue;
      costs.set(next, cost + 1);
      parents.set(next, id);
      open.push({ id: next, cost: cost + 1, score: cost + 1 + distance(point, endPoint) / NAV_STEP });
    }
  }
  return [];
}

function face(guard, heading, dt, slew = 4.9) {
  guard.angle += clamp(angleDelta(heading, guard.angle), -dt * slew, dt * slew);
}

function navigate(guard, goal, dt, blocks, speed) {
  if (distance(guard, goal) < 7) return true;
  let waypoint = goal;
  if (lineClear(guard, goal, blocks, guard.radius)) {
    guard.nav = null;
  } else {
    guard.navAge -= dt;
    if (!guard.nav || guard.navAge <= 0) {
      guard.nav = planPath(guard, goal, blocks);
      guard.navAge = guard.mode === 'ALERT' ? 0.4 : 0.85;
    }
    while (guard.nav[0] && distance(guard, guard.nav[0]) < 5) guard.nav.shift();
    waypoint = guard.nav[0];
    if (!waypoint) return false;
  }
  const heading = angleBetween(guard, waypoint);
  face(guard, heading, dt);
  const stride = Math.min(distance(guard, waypoint), dt * speed);
  guard.motion = slide(guard, Math.cos(heading) * stride, Math.sin(heading) * stride, blocks);
  guard.progress += guard.motion;
  return false;
}

function changeMode(guard, mode, timer = 0, target = null) {
  guard.mode = mode;
  guard.timer = timer;
  guard.target = target;
  guard.nav = null;
  guard.navAge = 0;
}

export function hearNoise(guards, noise, time, blocks) {
  for (const guard of guards) {
    if (guard.mode === 'ALERT' || time - guard.heard < (noise.kind === 'decoy' ? 0.24 : 1.1)) continue;
    const reaches = noise.radius * (lineClear(guard, noise, blocks) ? 1 : 0.47);
    if (distance(guard, noise) > reaches) continue;
    guard.heard = time;
    const target = { x: noise.x, y: noise.y };
    guard.awareness = Math.max(guard.awareness, noise.kind === 'decoy' ? 0.20 : 0.37);
    changeMode(guard, 'INVESTIGATE', 5, target);
  }
}

export function updateGuard(guard, player, dt, blocks, engage, escape) {
  const exposure = engage ? coneExposure(guard, player, blocks) : 0;
  guard.visual = exposure;
  guard.motion = 0;
  if (exposure > 0) {
    guard.lost = 0;
    guard.lastSeen = { x: player.x, y: player.y };
    guard.awareness = clamp(guard.awareness + dt * exposure * (escape ? 1.68 : 1.47), 0, 1);
    if (guard.awareness >= 0.91 && guard.mode !== 'ALERT') changeMode(guard, 'ALERT');
    else if (guard.awareness > 0.32 && ['PATROL', 'PAUSE', 'RETURN'].includes(guard.mode)) changeMode(guard, 'SUSPICIOUS', 0.88);
  } else {
    guard.lost += dt;
    guard.awareness = Math.max(0, guard.awareness - dt * (guard.mode === 'ALERT' ? 0.18 : 0.27));
  }
  guard.timer -= dt;
  const pace = escape ? 1.13 : 1;
  switch (guard.mode) {
    case 'PATROL': {
      const next = guard.route[guard.routeIndex];
      if (navigate(guard, { x: next[0], y: next[1] }, dt, blocks, SPEED.PATROL * pace)) {
        guard.look = guard.angle;
        guard.routeIndex = (guard.routeIndex + 1) % guard.route.length;
        changeMode(guard, 'PAUSE', 1.1);
      }
      break;
    }
    case 'PAUSE':
      face(guard, (guard.look ?? guard.facing) + Math.sin((1.1 - guard.timer) * 2.7) * 0.66, dt);
      if (guard.timer <= 0) changeMode(guard, 'PATROL');
      break;
    case 'SUSPICIOUS':
      if (guard.lastSeen) face(guard, angleBetween(guard, guard.lastSeen), dt);
      if (guard.timer <= 0) changeMode(guard, 'INVESTIGATE', 4.5, guard.lastSeen);
      break;
    case 'ALERT':
      if (guard.lastSeen) navigate(guard, guard.lastSeen, dt, blocks, SPEED.ALERT * pace);
      if (guard.lost > 2.35) {
        guard.look = guard.angle;
        changeMode(guard, 'SEARCH', 2.7);
      }
      break;
    case 'INVESTIGATE':
      if (!guard.target || navigate(guard, guard.target, dt, blocks, SPEED.INVESTIGATE * pace) || guard.timer <= 0) {
        guard.look = guard.angle;
        changeMode(guard, 'SEARCH', 2.7);
      }
      break;
    case 'SEARCH':
      face(guard, guard.look + SEARCH_TURNS[clamp(Math.floor((2.7 - guard.timer) / 0.9), 0, 2)], dt);
      if (guard.timer <= 0) changeMode(guard, 'RETURN');
      break;
    case 'RETURN': {
      const next = guard.route[guard.routeIndex];
      if (navigate(guard, { x: next[0], y: next[1] }, dt, blocks, SPEED.RETURN)) changeMode(guard, 'PATROL');
      break;
    }
  }
  return exposure;
}
