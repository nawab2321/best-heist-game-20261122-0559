const SIGNALS = {
  intel: [[52, 0.08], [59, 0.13]],
  pin: [[45, 0.058], [52, 0.08]],
  vault: [[33, 0.18], [45, 0.22], [52, 0.28]],
  jam: [[56, 0.11], [49, 0.10], [38, 0.19]],
  error: [[40, 0.14], [36, 0.19]],
  alarm: [[44, 0.16], [40, 0.16], [44, 0.22]],
  diamond: [[57, 0.16], [64, 0.19], [69, 0.23], [73, 0.37]],
  escape: [[33, 0.31], [45, 0.29], [52, 0.28], [57, 0.44]],
  throw: [[48, 0.045]],
  coin: [[78, 0.065], [84, 0.12]],
};

export function createAudio() {
  let context;
  let master;
  let rain;
  let noiseBuffer;
  let muted = false;
  let ambience = false;
  let thunderAt = 0;
  let radioAt = 0;
  let servoAt = 0;

  function wake() {
    if (muted) return;
    try {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = 0.6;
        master.connect(context.destination);
        noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * 2.4), context.sampleRate);
        const samples = noiseBuffer.getChannelData(0);
        let previous = 0;
        for (let i = 0; i < samples.length; i += 1) {
          previous = (previous + (Math.random() * 2 - 1) * 0.13) / 1.12;
          samples[i] = previous;
        }
        const wind = context.createBufferSource();
        wind.buffer = noiseBuffer;
        wind.loop = true;
        const filter = context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 430;
        rain = context.createGain();
        rain.gain.value = ambience ? 0.27 : 0.12;
        wind.connect(filter).connect(rain).connect(master);
        wind.start();
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch {
      // Sound is optional on devices where Web Audio is disabled.
    }
  }

  function setMuted(value) {
    muted = value;
    if (!muted) wake();
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.6, context.currentTime, 0.025);
  }

  function setActive(value) {
    ambience = value;
    if (rain) rain.gain.setTargetAtTime(value ? 0.28 : 0.12, context.currentTime, 0.28);
    thunderAt = 0;
    radioAt = 0;
    servoAt = 0;
  }

  function tone(midi, start, duration, volume, wave = 'triangle') {
    const voice = context.createOscillator();
    const envelope = context.createGain();
    voice.type = wave;
    voice.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(0.001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
    voice.connect(envelope).connect(master);
    voice.start(start);
    voice.stop(start + duration + 0.01);
  }

  function noise(duration, frequency, volume, kind = 'lowpass') {
    const start = context.currentTime;
    const voice = context.createBufferSource();
    voice.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = kind;
    filter.frequency.value = frequency;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(volume, start);
    envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
    voice.connect(filter).connect(envelope).connect(master);
    voice.start(start, Math.random() * 0.57);
    voice.stop(start + duration + 0.01);
  }

  function play(event) {
    if (!context || muted || context.state !== 'running') return;
    if (event === 'step') { noise(0.12, 430, 0.115); return; }
    if (event === 'escape') noise(1.5, 106, 0.21);
    const pattern = SIGNALS[event];
    if (!pattern) return;
    let start = context.currentTime;
    for (const [note, duration] of pattern) {
      tone(note, start, duration, event === 'coin' ? 0.085 : 0.105);
      start += duration * 0.62;
    }
  }

  function update(mission) {
    if (!context || muted || context.state !== 'running' || !ambience) return;
    const { time, security, player } = mission;
    if (time > thunderAt) {
      thunderAt = time + 12.5 + Math.random() * 6;
      if (time > 1) noise(1.6, 93, 0.4);
    }
    if (security.trace >= 63 && time >= radioAt) {
      radioAt = time + (security.lockdown ? 0.67 : 1.8);
      tone(41, context.currentTime, 0.28, 0.045, 'sine');
      tone(58, context.currentTime + 0.10, 0.12, 0.03);
    }
    if (time >= servoAt && security.cameras.some(camera => !camera.offline && camera.jammed <= time && Math.hypot(camera.x - player.x, camera.y - player.y) < 72)) {
      servoAt = time + 1;
      noise(0.19, 1800, 0.065, 'bandpass');
    }
  }

  return { wake, setMuted, setActive, play, update };
}
