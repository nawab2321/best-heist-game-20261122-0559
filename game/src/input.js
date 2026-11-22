import { VIEW } from './level.js';

const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'KeyC', 'Space', 'KeyQ', 'KeyE', 'Tab', 'Escape', 'KeyR', 'KeyM', 'Enter']);
const held = new Set();
const pending = new Set();

export function bindInput(canvas, onBlur, allowTab) {
  let aim = null;
  const capture = event => {
    if (event.metaKey || event.altKey || !GAME_KEYS.has(event.code)) return;
    if (event.code === 'Tab' && !allowTab()) return;
    if (event.target instanceof HTMLButtonElement && ['Space', 'Enter'].includes(event.code)) return;
    event.preventDefault();
    held.add(event.code);
    if (!event.repeat) pending.add(event.code);
  };
  const release = event => held.delete(event.code);
  const clear = () => {
    held.clear();
    pending.clear();
    aim = null;
  };
  const unfocus = () => { clear(); onBlur(); };
  window.addEventListener('keydown', capture);
  window.addEventListener('keyup', release);
  window.addEventListener('blur', unfocus);
  document.addEventListener('visibilitychange', () => { if (document.hidden) unfocus(); });
  function pointer(event) {
    const box = canvas.getBoundingClientRect();
    aim = {
      x: (event.clientX - box.x) / box.width * VIEW.width,
      y: (event.clientY - box.y) / box.height * VIEW.height,
    };
  }
  canvas.addEventListener('pointermove', pointer);
  canvas.addEventListener('pointerleave', () => { aim = null; });
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    pointer(event);
    pending.add('Space');
    if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
  });
  const has = (...codes) => codes.some(code => held.has(code));
  return {
    clear,
    aim() { return aim; },
    take(code) { return pending.delete(code); },
    motion() {
      return {
        x: Number(has('KeyD', 'ArrowRight')) - Number(has('KeyA', 'ArrowLeft')),
        y: Number(has('KeyS', 'ArrowDown')) - Number(has('KeyW', 'ArrowUp')),
        crouch: has('KeyC', 'ControlLeft', 'ControlRight'), sprint: has('ShiftLeft', 'ShiftRight'), aim,
      };
    },
  };
}
