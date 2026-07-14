// Lightweight synthesized sound effects via Web Audio — no audio assets needed.

const MUTE_KEY = 'poke-guess-muted';

let ctx: AudioContext | null = null;
let muted = false;
let muteLoaded = false;

function ensureMuteLoaded() {
  if (!muteLoaded && typeof window !== 'undefined') {
    muted = localStorage.getItem(MUTE_KEY) === '1';
    muteLoaded = true;
  }
}

export function isMuted(): boolean {
  ensureMuteLoaded();
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  muteLoaded = true;
  if (typeof window !== 'undefined') {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  startDelay: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.15
) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ac.currentTime + startDelay;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Soft blip for taps and option presses. */
export function playClick() {
  if (isMuted()) return;
  tone(660, 0, 0.06, 'square', 0.04);
}

/** Rising arpeggio — correct answer. */
export function playCorrect() {
  if (isMuted()) return;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.14));
}

/** Low descending buzz — wrong answer. Gentle, not punishing. */
export function playWrong() {
  if (isMuted()) return;
  tone(220, 0, 0.22, 'sawtooth', 0.07);
  tone(174.61, 0.13, 0.3, 'sawtooth', 0.07);
}

/** Triumphant fanfare — milestone reached. */
export function playMilestone() {
  if (isMuted()) return;
  const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51];
  notes.forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.13));
}

/** Filtered-noise whoosh — Tactical Skip smoke screen. */
export function playSkip() {
  if (isMuted()) return;
  const ac = getCtx();
  if (!ac) return;
  const len = 0.45;
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * len), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1400, ac.currentTime);
  filter.frequency.exponentialRampToValueAtTime(250, ac.currentTime + len);
  const gain = ac.createGain();
  gain.gain.value = 0.12;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  src.start();
}
