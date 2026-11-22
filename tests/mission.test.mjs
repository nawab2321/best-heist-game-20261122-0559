import test from 'node:test';
import assert from 'node:assert/strict';
import { angleDelta, coneExposure, conePolygon, distance, rayLimit, slide } from '../game/src/geometry.js';
import { createGuards, hearNoise, updateGuard } from '../game/src/guards.js';
import { CARD_GATE, SPAWN, STEP, STATIONS } from '../game/src/level.js';
import { createMission, nearbyStation, SPEED, stepMission } from '../game/src/mission.js';
import { createSecurity, jamCameras, LOCK_STAGES, updateSurveillance, updateTrace } from '../game/src/security.js';

function ticks(mission, count, input = {}) {
  for (let i = 0; i < count; i += 1) stepMission(mission, STEP, input);
}

function walkTo(mission, x, y, crouch = false) {
  for (const [axis, value] of [['x', x], ['y', y]]) {
    const max = crouch ? SPEED.crouch : SPEED.walk;
    const delta = value - mission.player[axis];
    ticks(mission, Math.round(Math.abs(delta) / max / STEP), { x: 0, y: 0, [axis]: Math.sign(delta), crouch });
    assert.ok(Math.abs(mission.player[axis] - value) < 4, `Reached ${axis}=${value}, actual ${mission.player[axis]}`);
  }
}

function press(mission, action) { stepMission(mission, STEP, { [action]: true }); }

function solveLock(mission) {
  for (const [stage, pin] of LOCK_STAGES.entries()) {
    for (let i = 0; i < 340; i += 1) {
      assert.equal(mission.lock.stage, stage);
      const next = mission.lock.angle + pin.speed * STEP;
      if (!mission.lock.stun && Math.abs(angleDelta(next, pin.target)) < 0.08) {
        press(mission, 'use');
        break;
      }
      ticks(mission, 1);
    }
  }
}

const from = { x: 0, y: 0, angle: 0, range: 180, fov: 1 };
const cover = [{ x: 30, y: -17, w: 15, h: 34 }];

test('walls block movement and let an actor slide parallel', () => {
  const p = { x: 15, y: 0, radius: 10 };
  slide(p, 12, 5, cover);
  assert.deepEqual(p, { x: 15, y: 5, radius: 10 });
  const mission = createMission();
  ticks(mission, 180, { x: -1, y: 0, sprint: true });
  assert.ok(mission.player.x >= 51 && mission.player.x < 55);
});

test('diagonals normalize and stance changes speed', () => {
  for (const [stance, speed] of Object.entries(SPEED)) {
    const mission = createMission();
    ticks(mission, 12, { x: 1, y: 1, [stance]: true });
    assert.ok(Math.abs(distance(SPAWN, mission.player) - speed * 0.2) < 0.01);
  }
});

test('covers occlude vision, including the edge of the drawn polygon', () => {
  const player = { x: 58, y: 0, stance: 'walk' };
  assert.equal(coneExposure(from, player, cover), 0);
  assert.ok(coneExposure(from, player, []) > coneExposure(from, { ...player, stance: 'crouch' }, []));
  const tip = conePolygon(from, cover).find(([, y]) => Math.abs(y) < 0.0001);
  assert.deepEqual(tip, [30, 0]);
  assert.equal(rayLimit(0, 0, 180, 0, cover), 1 / 6);
});

test('guard loses line of sight, searches last known position, and resumes patrol', () => {
  const guard = { ...createGuards()[0], ...from, route: [[-25, -10], [-22, 10]], angle: 0, awareness: 1, mode: 'ALERT', lastSeen: { x: 10, y: 0 } };
  const hidden = { x: 58, y: 0, stance: 'walk' };
  for (let i = 0; i < 151; i += 1) updateGuard(guard, hidden, STEP, cover, true, false);
  assert.equal(guard.mode, 'SEARCH');
  assert.equal(guard.visual, 0);
  assert.deepEqual(guard.lastSeen, { x: 10, y: 0 });
  for (let i = 0; i < 400; i += 1) updateGuard(guard, hidden, STEP, cover, false, false);
  assert.ok(['PATROL', 'PAUSE'].includes(guard.mode));
});

test('decoy landing consumes one gadget and redirects a guard', () => {
  const mission = createMission();
  mission.player.x = 500;
  mission.player.y = 290;
  stepMission(mission, STEP, { decoy: true, aim: { x: 508, y: 236 } });
  assert.equal(mission.kit.decoys, 2);
  ticks(mission, 25);
  assert.equal(mission.guards[0].mode, 'INVESTIGATE');
  assert.deepEqual(mission.guards[0].target, { x: 508, y: 236 });
});

test('sprint noise reaches nearby guards with distance and occlusion limits', () => {
  const guards = createGuards();
  hearNoise(guards, { x: 480, y: 270, radius: 118, kind: 'step' }, 2, []);
  assert.equal(guards[0].mode, 'INVESTIGATE');
  assert.notEqual(guards[1].mode, 'INVESTIGATE');
  const blocked = createGuards();
  hearNoise(blocked, { x: 545, y: 270, radius: 118, kind: 'step' }, 2, [{ x: 500, y: 230, w: 17, h: 80 }]);
  assert.notEqual(blocked[0].mode, 'INVESTIGATE');
});

test('camera sweep detects players and a jam suppresses detection until expiry', () => {
  const security = createSecurity();
  const camera = security.cameras[0];
  const target = { x: camera.x + 64, y: camera.y + 60, radius: 10, stance: 'walk', motion: 0 };
  let reading = updateSurveillance(security, target, 0, STEP, [], true);
  assert.ok(reading.cameraExposure > 0);
  const firstAngle = camera.angle;
  updateSurveillance(security, target, 1, STEP, [], true);
  assert.notEqual(firstAngle, camera.angle);
  assert.ok(jamCameras(security, target, 1) > 0);
  reading = updateSurveillance(security, target, 1.1, STEP, [], true);
  assert.equal(reading.cameraExposure, 0);
  assert.ok(camera.jammed < 8);
  updateSurveillance(security, target, 8, STEP, [], true);
  assert.notEqual(camera.angle, firstAngle);
});

test('active lasers cause a burst with cooldown, and dark beams are safe', () => {
  const security = createSecurity();
  const target = { x: 985, y: 294, radius: 10, stance: 'walk', motion: 0 };
  assert.ok(updateSurveillance(security, target, 0.2, STEP, [], true).laserHit);
  assert.equal(updateSurveillance(security, target, 0.3, STEP, [], true).laserHit, false);
  assert.equal(updateSurveillance(createSecurity(), target, 3.2, STEP, [], true).laserHit, false);
});

test('motion sensor distinguishes crouching and loses power at the relay', () => {
  const security = createSecurity();
  const player = { ...security.sensor, radius: 10, motion: 1, stance: 'crouch' };
  assert.equal(updateSurveillance(security, player, 0.5, STEP, [], true).sensorHit, false);
  player.stance = 'sprint';
  assert.ok(updateSurveillance(security, player, 0.6, STEP, [], true).sensorHit);
  security.blackout = true;
  security.sensor.latched = false;
  assert.equal(updateSurveillance(security, player, 0.7, STEP, [], true).sensorHit, false);
});

test('alarm escalates, cooldown enables recovery, and lockdown causes failure', () => {
  const security = createSecurity();
  const signal = { guard: 0.72, camera: 0.62, burst: 0 };
  for (let i = 0; i < 134; i += 1) updateTrace(security, signal, STEP, false);
  assert.equal(security.stage, 'SEARCHING');
  assert.equal(security.incidents, 1);
  for (let i = 0; i < 600; i += 1) updateTrace(security, { guard: 0, camera: 0, burst: 0 }, STEP, false);
  assert.equal(security.stage, 'CLEAR');
  const mission = createMission();
  mission.security.trace = 100;
  ticks(mission, 430);
  assert.equal(mission.status, 'failure');
  assert.match(mission.failure, /lockdown/);
  assert.equal(createMission().security.trace, 0);
});

test('misaligned tumbler adds trace, stays on the same pin, and can be cancelled', () => {
  const mission = createMission();
  Object.assign(mission.player, { x: 880, y: 320 });
  mission.objective = 'lock';
  press(mission, 'use');
  press(mission, 'use');
  assert.equal(mission.lock.stage, 0);
  assert.equal(mission.lock.flash, 'miss');
  assert.ok(mission.security.trace >= 11);
  press(mission, 'cancel');
  assert.equal(mission.lock, null);
  assert.equal(mission.gateOpen, false);
});

test('complete playable route clears the relay and gate, takes loot, and escapes', () => {
  const mission = createMission();
  assert.ok(mission.blocks.includes(CARD_GATE));
  walkTo(mission, 174, 539);
  walkTo(mission, 174, 228);
  walkTo(mission, 134, 228);
  press(mission, 'use');
  assert.equal(mission.objective, 'relay');
  assert.ok(!mission.blocks.includes(CARD_GATE));
  walkTo(mission, 177, 228);
  walkTo(mission, 177, 559);
  walkTo(mission, 631, 559);
  press(mission, 'use');
  assert.ok(mission.security.blackout);
  assert.equal(mission.security.cameras.filter(camera => camera.offline).length, 2);
  walkTo(mission, 890, 559, true);
  walkTo(mission, 890, 316, true);
  press(mission, 'use');
  solveLock(mission);
  assert.ok(mission.gateOpen);
  assert.equal(mission.objective, 'diamond');
  walkTo(mission, 945, 316);
  while (mission.security.lasers[0].powered) ticks(mission, 1);
  walkTo(mission, 1086, 316);
  assert.equal(nearbyStation(mission), STATIONS.diamond);
  press(mission, 'use');
  assert.ok(mission.hasDiamond);
  assert.equal(mission.objective, 'exit');
  walkTo(mission, 1010, 316);
  while (mission.security.lasers[0].powered) ticks(mission, 1);
  walkTo(mission, 892, 316);
  walkTo(mission, 892, 559);
  walkTo(mission, 1130, 559);
  press(mission, 'use');
  assert.equal(mission.status, 'victory');
  assert.ok(mission.grade);
  assert.equal(createMission().kit.decoys, 3);
  assert.equal(createMission().hasDiamond, false);
});
