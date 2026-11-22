import { LOCK_STAGES } from './security.js';
import { clockLabel, nearbyStation, OBJECTIVES } from './mission.js';
import { VIEW } from './level.js';

const ZONES = { credential: 'SERVICE RECORDS', relay: 'SURVEILLANCE WING', lock: 'VAULT THRESHOLD', diamond: 'DISPLAY CHAMBER', exit: 'GETAWAY BAY' };
const objectiveOrder = Object.keys(OBJECTIVES);
const get = id => document.getElementById(id);
const content = get('dialog-content');
const overlay = get('overlay');
const buttons = get('dialog-actions');
const hud = get('interface');
const title = get('title');
const trace = get('trace');
const meter = get('trace-meter');
const traceFill = get('trace-fill');
const notice = get('notice');
const interaction = get('interaction');
const lock = get('lock');
const lockArc = get('lock-arc');
const lockNeedle = get('lock-needle');
const cargo = get('cargo');
const elements = Object.fromEntries(['objective-index', 'objective-zone', 'objective', 'trace-value', 'trace-phase', 'warning', 'timer', 'field-state', 'notice-text', 'interaction-text', 'status', 'lock-state'].map(id => [id, get(id)]));

const tutorial = [
  ['WASD / Arrows', 'Move'], ['Shift', 'Sprint and make noise'], ['C / Ctrl', 'Crouch and reduce exposure'], ['E', 'Use a station or set a vault pin'],
  ['Space / Click', 'Throw a decoy toward the cursor'], ['Q', 'Jam nearby cameras for 6.8 s'], ['Tab / Esc', 'Mission intel / pause'], ['R / M', 'Restart / toggle audio'],
];

function set(element, value) {
  if (element.textContent !== value) element.textContent = value;
}
const label = (key, value) => set(elements[key], value);

function charges(id, limit) {
  const container = get(id);
  const marks = Array.from({ length: limit }, () => {
    const mark = document.createElement('span');
    mark.className = 'charge';
    container.append(mark);
    return mark;
  });
  return count => {
    for (let i = 0; i < limit; i += 1) marks[i].classList.toggle('filled', i < count);
    container.setAttribute('aria-label', `${count} ${id} remaining`);
  };
}

const decoys = charges('decoys', 3);
const jammers = charges('jammers', 2);

export function renderHUD(mission) {
  const { objective, security, hasDiamond, time, player } = mission;
  label('objective-index', `0${objectiveOrder.indexOf(objective) + 1} / 05`);
  label('objective-zone', ZONES[objective]);
  label('objective', OBJECTIVES[objective]);
  const value = String(Math.floor(security.trace)).padStart(2, '0');
  const isLockdown = security.stage === 'LOCKDOWN';
  trace.dataset.phase = security.stage;
  if (meter.getAttribute('aria-valuenow') !== value) meter.setAttribute('aria-valuenow', value);
  traceFill.style.transform = `scaleX(${security.trace / 100})`;
  label('trace-value', `${value}%`);
  label('trace-phase', isLockdown ? `LOCKDOWN · ${Math.ceil(security.lockdown)}s` : security.stage);
  label('warning', mission.warning);
  label('timer', clockLabel(time));
  label('field-state', hasDiamond ? 'EXTRACTION ACTIVE' : mission.gateOpen ? 'VAULT OPEN' : 'INFILTRATION');
  decoys(mission.kit.decoys);
  jammers(mission.kit.jammers);
  cargo.dataset.secured = String(hasDiamond);
  set(cargo, hasDiamond ? 'SECURED' : 'IN VAULT');
  const visible = mission.notice && time < mission.notice.until;
  notice.hidden = !visible;
  if (visible) {
    notice.dataset.kind = mission.notice.kind;
    label('notice-text', mission.notice.text);
    label('status', mission.notice.text);
  } else label('status', OBJECTIVES[objective]);
  const station = !mission.lock && nearbyStation(mission);
  interaction.hidden = !station;
  if (station) {
    interaction.style.left = `${station.x / VIEW.width * 100}%`;
    const y = Math.min(608, Math.max(station.y + 31, player.y + 23));
    interaction.style.top = `${y / VIEW.height * 100}%`;
    label('interaction-text', station.action);
  }
  lock.hidden = !mission.lock;
  if (mission.lock) {
    const { stage, angle, stun, flash } = mission.lock;
    label('lock-state', `PIN 0${stage + 1} / 03`);
    lock.dataset.flash = stun ? flash : '';
    lockArc.style.setProperty('--target', `${LOCK_STAGES[stage].target}rad`);
    lockArc.style.setProperty('--size', `${LOCK_STAGES[stage].tolerance}rad`);
    lockNeedle.style.setProperty('--angle', `${angle}rad`);
  }
}

function paragraph(text) {
  const element = document.createElement('p');
  element.textContent = text;
  content.append(element);
}

function facts(rows) {
  const list = document.createElement('dl');
  for (const [name, value] of rows) {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = name;
    description.textContent = value;
    row.append(term, description);
    list.append(row);
  }
  content.append(list);
}

function action(name, listener, primary) {
  const button = document.createElement('button');
  button.textContent = name;
  button.type = 'button';
  if (primary) button.className = 'primary';
  button.addEventListener('click', listener);
  buttons.append(button);
}

export function present(screen, mission, actions) {
  title.hidden = screen !== 'title' && screen !== 'manual';
  hud.hidden = screen === 'title' || screen === 'manual';
  overlay.hidden = screen === 'title' || screen === 'play';
  title.inert = !overlay.hidden;
  hud.inert = !overlay.hidden;
  lock.hidden = screen !== 'play' || !mission.lock;
  if (overlay.hidden) return;
  content.replaceChildren();
  buttons.replaceChildren();
  const help = screen === 'manual' || screen === 'intel';
  if (help) {
    set(get('dialog-kicker'), 'OPERATION MIDNIGHT');
    set(get('dialog-title'), 'Mission intel');
    paragraph('The north passage is watched. The service hall is longer and offers more cover. Read the mint camera cones and amber patrol cones before you move.');
    facts(tutorial);
    action(screen === 'intel' ? 'Resume heist' : 'Back to briefing', actions.close, true);
    if (screen === 'manual') action('Start heist', actions.start);
  } else if (screen === 'pause') {
    set(get('dialog-kicker'), 'OPERATION MIDNIGHT');
    set(get('dialog-title'), 'Mission paused');
    paragraph('Current objective · ' + OBJECTIVES[mission.objective]);
    action('Resume heist', actions.close, true);
    action('Restart', actions.start);
    action('Briefing', actions.title);
  } else {
    const win = screen === 'victory';
    set(get('dialog-kicker'), win ? 'THE STORM COVERED YOUR EXIT' : 'VESPER SECURITY INTERCEPT');
    set(get('dialog-title'), win ? 'Heist complete' : 'Mission failed');
    paragraph(win ? 'The Midnight Diamond is out of the bank.' : mission.failure + '.');
    facts([
      ['ELAPSED', clockLabel(mission.time)], ['DETECTION INCIDENTS', String(mission.security.incidents)],
      ['ALARM TRIGGERED', mission.security.triggered ? `Yes · peak ${Math.floor(mission.security.peak)}%` : `No · peak ${Math.floor(mission.security.peak)}%`],
      ['LOOT', win ? 'Midnight Diamond secured' : mission.hasDiamond ? 'Diamond recovered by security' : 'Diamond held in vault'],
      ...(win ? [['FINAL RATING', mission.grade]] : []),
    ]);
    action(win ? 'Run it again' : 'Retry heist', actions.start, true);
    action('Briefing', actions.title);
  }
  buttons.firstElementChild?.focus({ preventScroll: true });
}

export function updateAudio(muted) {
  const button = get('menu-audio');
  set(button, muted ? 'Audio off' : 'Audio on');
  button.setAttribute('aria-pressed', String(!muted));
  get('hud-audio').setAttribute('aria-pressed', String(!muted));
  set(get('sound-status'), muted ? 'OFF' : 'ON');
}
