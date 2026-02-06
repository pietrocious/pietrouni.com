// audio.ts - toggleable UI sound effects using Web Audio API
// All sounds are synthesized (no external files needed)
// Muted by default — enabled in Settings

let audioCtx: AudioContext | null = null;
let soundEnabled = false;

function getCtx(): AudioContext | null {
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

// Generic tone helper
function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.08,
  rampDown: number = duration * 0.8
): void {
  if (!soundEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + rampDown);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

// Noise burst helper (for clicks)
function playNoise(duration: number, volume: number = 0.03): void {
  if (!soundEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;

  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(2000, ctx.currentTime);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start();
}

// ===== UI Sound Effects =====

// Boot chime — warm two-note chord
export function playBootChime(): void {
  if (!soundEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;

  // C5 + E5 chord
  [523.25, 659.25].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.05);
    osc.stop(ctx.currentTime + 1.5);
  });
}

// Soft click (dock tap, button press)
export function playClick(): void {
  playNoise(0.05, 0.04);
  playTone(800, 0.05, 'sine', 0.03, 0.04);
}

// Window open — ascending whoosh
export function playWindowOpen(): void {
  playTone(300, 0.15, 'sine', 0.05, 0.12);
  setTimeout(() => playTone(500, 0.1, 'sine', 0.03, 0.08), 50);
}

// Window close — descending tone
export function playWindowClose(): void {
  playTone(500, 0.12, 'sine', 0.04, 0.1);
  setTimeout(() => playTone(300, 0.1, 'sine', 0.03, 0.08), 40);
}

// Notification ping
export function playNotification(): void {
  playTone(880, 0.15, 'sine', 0.06, 0.12);
  setTimeout(() => playTone(1100, 0.12, 'sine', 0.04, 0.1), 100);
}

// Key tick (terminal typing)
export function playKeyTick(): void {
  playNoise(0.02, 0.015);
}

// ===== State Management =====

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function toggleSound(): boolean {
  soundEnabled = !soundEnabled;
  localStorage.setItem('pietros-sound', soundEnabled ? '1' : '0');

  // Resume audio context if needed (browser autoplay policy)
  if (soundEnabled) {
    const ctx = getCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    // Play a confirmation click
    playClick();
  }

  return soundEnabled;
}

export function initAudio(): void {
  // Load saved preference (default: off)
  soundEnabled = localStorage.getItem('pietros-sound') === '1';
}
