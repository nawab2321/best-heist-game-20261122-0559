import { FLOOR_BLOCKS, LOCKED_BLOCKS, SPAWN, STATIONS, VAULT_LOCKED_BLOCKS } from './level.js';
import { angleDelta, clamp, distance, lineClear, rayLimit, slide } from './geometry.js';
import { createGuards, hearNoise, updateGuard } from './guards.js';
import { createSecurity, dropRelay, JAMMER_RADIUS, jamCameras, LOCK_STAGES, updateSurveillance, updateTrace } from './security.js';

export const OBJECTIVES = {
  credential: 'Acquire the access card', relay: 'Cut the surveillance relay',
  lock: 'Crack the vault lock', diamond: 'Steal the Midnight Diamond', exit: 'Reach the getaway car',
};
export const SPEED = { crouch: 89, walk: 149, sprint: 220 };

export function createMission() {
  return {
    time: 0, status: 'active', objective: 'credential', gateOpen: false, hasDiamond: false,
    player: { ...SPAWN, radius: 10, angle: 0, stance: 'walk', motion: 0, progress: 0, footstep: 0 },
    guards: createGuards(), security: createSecurity(), blocks: LOCKED_BLOCKS,
    kit: { decoys: 3, jammers: 2 }, decoy: null, pulse: null, lock: null, entered: false,
    contact: 0, noise: 0, warning: '', events: [], notice: null, grade: '', failure: '',
  };
}

function notify(mission, text, kind = 'intel') {
  mission.notice = { text, kind, until: mission.time + 3.2 };
  mission.events.push(kind);
}

export function nearbyStation(mission) {
  const station = STATIONS[mission.objective];
  if (!station || distance(mission.player, station) > (station.reach ?? 35)) return null;
  if (mission.objective !== 'diamond' && !lineClear(mission.player, station, mission.blocks)) return null;
  return station;
}

function alignTumbler(mission) {
  const lock = mission.lock;
  const { target, tolerance } = LOCK_STAGES[lock.stage];
  if (lock.stun > 0) return 0;
  if (Math.abs(angleDelta(lock.angle, target)) > tolerance) {
    lock.stun = 0.42;
    lock.flash = 'miss';
    notify(mission, 'Misaligned · security trace increased', 'error');
    return 11;
  }
  mission.events.push('pin');
  if (lock.stage + 1 < LOCK_STAGES.length) {
    lock.stage += 1;
    lock.angle = 0;
    lock.stun = 0.28;
    lock.flash = 'hit';
  } else {
    mission.lock = null;
    mission.gateOpen = true;
    mission.blocks = FLOOR_BLOCKS;
    mission.objective = 'diamond';
    notify(mission, 'Vault open · cross the laser grid', 'vault');
  }
  return 0;
}

function interact(mission) {
  if (mission.lock) return alignTumbler(mission);
  if (!nearbyStation(mission)) return 0;
  switch (mission.objective) {
    case 'credential':
      mission.objective = 'relay';
      mission.blocks = VAULT_LOCKED_BLOCKS;
      notify(mission, 'Access card acquired · north keycard door unlocked', 'intel');
      break;
    case 'relay':
      dropRelay(mission.security);
      mission.objective = 'lock';
      notify(mission, 'Lobby cameras offline · vault on backup power', 'jam');
      break;
    case 'lock':
      mission.lock = { stage: 0, angle: -2.68, stun: 0, flash: '' };
      mission.events.push('pin');
      break;
    case 'diamond':
      mission.hasDiamond = true;
      mission.objective = 'exit';
      mission.security.trace = Math.max(mission.security.trace, 29);
      notify(mission, 'Diamond secured · get to the car', 'diamond');
      break;
    case 'exit':
      mission.status = 'victory';
      mission.grade = mission.security.peak < 46 && mission.security.incidents <= 2 ? 'GHOST' :
        mission.security.peak < 63 ? 'SHADOW' : mission.security.peak < 90 ? 'PROFESSIONAL' : 'CHAOTIC';
      notify(mission, 'Extraction complete', 'escape');
      break;
  }
  return 0;
}

function throwDecoy(mission, aim) {
  if (!mission.kit.decoys || mission.decoy?.age < 0.35) return;
  const { player } = mission;
  const pointer = aim ?? { x: player.x + Math.cos(player.angle) * 130, y: player.y + Math.sin(player.angle) * 130 };
  const dx = pointer.x - player.x;
  const dy = pointer.y - player.y;
  const fraction = Math.min(1, 164 / (Math.hypot(dx, dy) || 1));
  const limit = rayLimit(player.x, player.y, dx * fraction, dy * fraction, mission.blocks, 3);
  mission.decoy = {
    fromX: player.x, fromY: player.y, x: player.x + dx * fraction * limit,
    y: player.y + dy * fraction * limit, age: 0, sounded: false,
  };
  mission.kit.decoys -= 1;
  mission.events.push('throw');
}

function launchJammer(mission) {
  if (!mission.kit.jammers) return;
  const count = jamCameras(mission.security, mission.player, mission.time);
  if (!count) {
    notify(mission, 'No active camera in jammer range');
    return;
  }
  mission.kit.jammers -= 1;
  mission.pulse = { x: mission.player.x, y: mission.player.y, time: mission.time, radius: JAMMER_RADIUS };
  notify(mission, `${count} camera${count === 1 ? '' : 's'} jammed`, 'jam');
}

function movePlayer(mission, dt, input) {
  const player = mission.player;
  const magnitude = Math.hypot(input.x ?? 0, input.y ?? 0);
  player.stance = input.crouch ? 'crouch' : input.sprint ? 'sprint' : 'walk';
  player.motion = 0;
  if (magnitude && !mission.lock) {
    const angle = Math.atan2(input.y, input.x);
    const speed = SPEED[player.stance] * dt;
    player.angle = angle;
    player.motion = slide(player, Math.cos(angle) * speed, Math.sin(angle) * speed, mission.blocks);
    player.progress += player.motion;
  }
  if (!mission.entered && player.x > 235) {
    mission.entered = true;
    if (mission.objective === 'credential') notify(mission, 'Access card located in service records');
  }
  let loud = false;
  if (player.motion > 0 && player.progress >= player.footstep) {
    player.footstep = player.progress + (player.stance === 'sprint' ? 42 : 31);
    if (player.stance !== 'crouch') mission.events.push('step');
    if (player.stance === 'sprint') {
      mission.noise = 0.30;
      const noise = { x: player.x, y: player.y, radius: 118, kind: 'step' };
      loud = mission.guards.some(guard => distance(guard, player) < 125);
      hearNoise(mission.guards, noise, mission.time, mission.blocks);
    }
  }
  return loud;
}

export function stepMission(mission, dt, input = {}, engage = true) {
  if (mission.status !== 'active') return;
  mission.events.length = 0;
  mission.time += dt;
  mission.noise = Math.max(0, mission.noise - dt);
  let burst = 0;
  if (mission.lock) {
    const lock = mission.lock;
    lock.stun = Math.max(0, lock.stun - dt);
    if (!lock.stun) lock.angle = angleDelta(lock.angle + LOCK_STAGES[lock.stage].speed * dt, 0);
    if (input.cancel) mission.lock = null;
  }
  const loud = engage && movePlayer(mission, dt, input);
  if (engage && input.use) burst += interact(mission);
  if (mission.status !== 'active') return;
  if (engage && !mission.lock) {
    if (input.decoy) throwDecoy(mission, input.aim);
    if (input.jam) launchJammer(mission);
  }
  if (mission.decoy) {
    const decoy = mission.decoy;
    decoy.age += dt;
    if (decoy.age >= 0.34 && !decoy.sounded) {
      decoy.sounded = true;
      hearNoise(mission.guards, { x: decoy.x, y: decoy.y, radius: 223, kind: 'decoy' }, mission.time, mission.blocks);
      mission.events.push('coin');
    }
    if (decoy.age >= 2.1) mission.decoy = null;
  }
  let guardExposure = 0;
  let caught = false;
  for (const guard of mission.guards) {
    const exposure = updateGuard(guard, mission.player, dt, mission.blocks, engage, mission.hasDiamond);
    if (guard.awareness > 0.30) guardExposure = Math.max(guardExposure, exposure);
    if (engage && guard.mode === 'ALERT' && distance(guard, mission.player) < 22 && lineClear(guard, mission.player, mission.blocks)) caught = true;
  }
  mission.contact = clamp(mission.contact + (caught ? dt : -dt * 1.75), 0, 1);
  const signals = updateSurveillance(mission.security, mission.player, mission.time, dt, mission.blocks, engage);
  if (signals.laserHit) { burst += 20; notify(mission, 'Laser grid tripped', 'error'); }
  if (signals.sensorHit) { burst += 13; notify(mission, 'Motion sensor tripped', 'error'); }
  const phase = mission.security.stage;
  updateTrace(mission.security, { guard: guardExposure, camera: signals.cameraExposure, burst, noise: loud }, dt, mission.hasDiamond);
  if (mission.security.stage === 'LOCKDOWN' && phase !== 'LOCKDOWN') notify(mission, 'Lockdown · extraction window closing', 'alarm');
  mission.warning = caught ? 'GUARD CONTACT' : guardExposure > 0 ? 'GUARD SIGHTING' :
    signals.cameraExposure > 0 ? 'CAMERA CONTACT' : signals.laserHit ? 'LASER GRID' : '';
  const failure = mission.contact >= 0.57 ? 'A guard intercepted you' :
    mission.security.lockdown === 0.001 ? 'The bank completed its lockdown' : '';
  if (failure) {
    mission.status = 'failure';
    mission.failure = failure;
    notify(mission, failure, 'alarm');
  }
}

export function clockLabel(seconds) {
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}
