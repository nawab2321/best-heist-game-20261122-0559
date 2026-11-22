import { createAudio } from './audio.js';
import { bindInput } from './input.js';
import { present, renderHUD, updateAudio } from './interface.js';
import { STEP } from './level.js';
import { createMission, stepMission } from './mission.js';
import { createRenderer } from './render.js';

const canvas = document.getElementById('world');
const renderer = createRenderer(canvas);
const audio = createAudio();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let mission = createMission();
let screen = 'title';
let muted = readMute();
let accumulator = 0;
let previous = performance.now();
let firstStepActions = {};
let nextHUD = 0;
let victoryAt = 0;
const input = bindInput(canvas, () => {
  if (screen === 'play') changeScreen('pause');
}, () => screen === 'play' || screen === 'intel');

function readMute() {
  try { return localStorage.getItem('black-vault.mute') === 'yes'; } catch { return false; }
}

function toggleAudio() {
  muted = !muted;
  audio.setMuted(muted);
  updateAudio(muted);
  try { localStorage.setItem('black-vault.mute', muted ? 'yes' : 'no'); } catch { /* Audio still changes for this visit. */ }
}

function changeScreen(next) {
  screen = next;
  if (screen === 'victory') victoryAt = performance.now();
  accumulator = 0;
  firstStepActions = {};
  input.clear();
  if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
  audio.setActive(screen === 'play');
  present(screen, mission, actions);
  if (screen === 'play') renderHUD(mission);
  if (screen === 'title') document.getElementById('start').focus({ preventScroll: true });
}

function start() {
  mission = createMission();
  audio.wake();
  nextHUD = 0;
  changeScreen('play');
}

function showTitle() {
  mission = createMission();
  changeScreen('title');
}

const actions = { start, title: showTitle, close: () => changeScreen(screen === 'manual' ? 'title' : 'play') };
const bind = (id, click) => document.getElementById(id).addEventListener('click', click);
bind('start', start);
bind('how', () => changeScreen('manual'));
bind('menu-audio', toggleAudio);
bind('hud-audio', toggleAudio);
bind('pause-button', () => { if (screen === 'play') changeScreen('pause'); });
if (muted) audio.setMuted(true);
updateAudio(muted);

function handleActions() {
  if (input.take('KeyM')) toggleAudio();
  if (input.take('KeyR') && screen !== 'title' && screen !== 'manual') { start(); return; }
  if (input.take('Escape')) {
    if (screen === 'play' && mission.lock) firstStepActions.cancel = true;
    else if (screen === 'play') changeScreen('pause');
    else if (['pause', 'intel', 'manual'].includes(screen)) actions.close();
    else if (['victory', 'failure'].includes(screen)) showTitle();
  }
  if (input.take('Tab')) {
    if (screen === 'play') changeScreen('intel');
    else if (screen === 'intel') changeScreen('play');
  }
  const enter = input.take('Enter');
  const space = input.take('Space');
  const use = input.take('KeyE');
  const jam = input.take('KeyQ');
  if (screen === 'title' && (enter || space)) { start(); return; }
  if (screen === 'play') {
    firstStepActions.use ||= use;
    firstStepActions.decoy ||= space;
    firstStepActions.jam ||= jam;
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  accumulator += Math.min(0.10, (now - previous) / 1000);
  previous = now;
  handleActions();
  const active = screen === 'play';
  const preview = screen === 'title' || screen === 'manual';
  while (accumulator >= STEP && (active || preview)) {
    accumulator -= STEP;
    stepMission(mission, STEP, active ? { ...input.motion(), ...firstStepActions } : {}, active);
    firstStepActions = {};
    for (const event of mission.events) audio.play(event);
    if (mission.status !== 'active') { changeScreen(mission.status); break; }
  }
  if (!active && !preview) accumulator = 0;
  if (screen === 'play') {
    audio.update(mission);
    if (mission.lock || now > nextHUD) {
      renderHUD(mission);
      nextHUD = now + 50;
    }
  }
  const departure = screen === 'victory' && !reducedMotion.matches ? Math.min(1, (now - victoryAt) / 1100) : 0;
  renderer.draw(mission, { title: preview, aim: screen === 'play' ? input.aim() : null, departure: Math.max(0, departure) });
}
requestAnimationFrame(frame);
