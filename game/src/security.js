import { CAMERA_POSTS, LASER_LINES, MOTION_SENSOR } from './level.js';
import { clamp, coneExposure, distance, pointToSegment, TAU } from './geometry.js';

export const JAMMER_RADIUS = 232;
export const JAMMER_DURATION = 6.8;
export const CURVE = { guard: 25, camera: 20, heat: 0.64, cool: 8.5, lockdown: 7 };
export const LOCK_STAGES = [
  { target: -0.82, speed: 2.05, tolerance: 0.47 },
  { target: 1.09, speed: -2.65, tolerance: 0.37 },
  { target: -1.41, speed: 3.13, tolerance: 0.34 },
];

export function createSecurity() {
  return {
    cameras: CAMERA_POSTS.map(camera => ({ ...camera, fov: 0.84, angle: camera.base, jammed: 0, offline: false, visual: 0 })),
    lasers: LASER_LINES.map(line => ({ ...line, powered: true })),
    sensor: { ...MOTION_SENSOR, latched: false },
    trace: 0, peak: 0, quiet: 0, stage: 'CLEAR', incidents: 0,
    exposed: false, blackout: false, triggered: false, lockdown: 0, laserCooldown: 0,
  };
}

export function jamCameras(security, player, time) {
  let count = 0;
  for (const camera of security.cameras) {
    if (camera.offline || distance(camera, player) > JAMMER_RADIUS) continue;
    camera.jammed = time + JAMMER_DURATION;
    count += 1;
  }
  return count;
}

export function dropRelay(security) {
  security.blackout = true;
  security.trace = Math.max(0, security.trace - 26);
  if (security.trace < 100) security.lockdown = 0;
}

export function updateSurveillance(security, player, time, dt, blocks, engage) {
  let cameraExposure = 0;
  for (const camera of security.cameras) {
    camera.offline = security.blackout && camera.circuit === 'relay';
    if (!camera.offline && time >= camera.jammed) {
      camera.angle = camera.base + Math.sin(time / camera.period * TAU + camera.phase) * camera.sweep;
    }
    camera.visual = engage && !camera.offline && time >= camera.jammed ? coneExposure(camera, player, blocks) : 0;
    cameraExposure = Math.max(cameraExposure, camera.visual);
  }
  const rate = security.blackout ? 0.79 : 1;
  let beamContact = false;
  for (const beam of security.lasers) {
    const clock = (time + beam.offset) % beam.period;
    beam.powered = clock < beam.active * rate;
    beam.warning = clock > beam.period - 0.42;
    if (engage && beam.powered && pointToSegment(player, beam) < player.radius + 1) beamContact = true;
  }
  security.laserCooldown = Math.max(0, security.laserCooldown - dt);
  const laserHit = beamContact && security.laserCooldown === 0;
  if (laserHit) security.laserCooldown = 1.8;
  const nearSensor = distance(player, security.sensor) < security.sensor.radius;
  const sensorHit = engage && !security.blackout && nearSensor && !security.sensor.latched && player.motion > 0 && player.stance !== 'crouch';
  if (!nearSensor) security.sensor.latched = false;
  else if (sensorHit) security.sensor.latched = true;
  return { cameraExposure, laserHit, sensorHit };
}

export function updateTrace(security, signals, dt, escaping, difficulty = CURVE) {
  const pressure = signals.guard * difficulty.guard + signals.camera * difficulty.camera + (signals.noise ? 2.3 : 0);
  const burst = signals.burst;
  const exposed = signals.guard > 0 || signals.camera > 0 || burst > 0;
  if (exposed && !security.exposed) security.incidents += 1;
  security.exposed = exposed;
  security.quiet = pressure || burst ? 0 : security.quiet + dt;
  const cooling = !escaping && security.quiet > 1.2 ? difficulty.cool : 0;
  security.trace = clamp(security.trace + burst + (pressure + (escaping ? difficulty.heat : 0) - cooling) * dt, 0, 100);
  security.peak = Math.max(security.peak, security.trace);
  security.triggered ||= security.trace >= 63;
  if (security.trace >= 100) security.lockdown = security.lockdown || difficulty.lockdown;
  if (security.lockdown) security.lockdown = Math.max(0.001, security.lockdown - dt);
  security.stage = security.lockdown ? 'LOCKDOWN' : security.trace >= 63 ? 'SEARCHING' : security.trace >= 23 ? 'SUSPICIOUS' : 'CLEAR';
}
