'use strict';

const MIN_BPM = 30;
const MAX_BPM = 250;
const SWIPE_PX_PER_STEP = 24; // Pixel Wischweg pro 5er-Schritt
const LOOKAHEAD_MS = 25;      // Intervall des Schedulers
const SCHEDULE_AHEAD = 0.1;   // Sekunden, die im Voraus geplant werden

const $ = (id) => document.getElementById(id);
const els = {
  bpm: $('bpm-value'), slider: $('slider'), minus: $('minus'), plus: $('plus'),
  swiper: $('swiper'), track: $('swiper-track'), meter: $('meter'), accent: $('accent'),
  tap: $('tap'), start: $('start'), beats: $('beats'),
};

// ---------- Zustand ----------
const state = { bpm: 120, beats: 4, accent: true, running: false };

try {
  const saved = JSON.parse(localStorage.getItem('metronome') || '{}');
  Object.assign(state, {
    bpm: clamp(saved.bpm ?? state.bpm),
    beats: saved.beats ?? state.beats,
    accent: saved.accent ?? state.accent,
  });
} catch { /* ignorieren */ }

function save() {
  try {
    localStorage.setItem('metronome', JSON.stringify({ bpm: state.bpm, beats: state.beats, accent: state.accent }));
  } catch { /* ignorieren */ }
}

function clamp(v) { return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(v))); }

function setBpm(v) {
  state.bpm = clamp(v);
  els.bpm.textContent = state.bpm;
  els.slider.value = state.bpm;
  els.swiper.setAttribute('aria-valuenow', state.bpm);
  save();
}

// ---------- Audio ----------
let ctx = null;
let nextNoteTime = 0;
let currentBeat = 0;
let timerId = null;
const visualQueue = [];

function click(time, isAccent) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = isAccent ? 1600 : 1000;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(isAccent ? 1 : 0.6, time + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.06);
}

function scheduler() {
  while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
    if (currentBeat >= state.beats) currentBeat = 0;
    const isAccent = state.accent && currentBeat === 0 && state.beats > 1;
    click(nextNoteTime, isAccent);
    visualQueue.push({ beat: currentBeat, time: nextNoteTime });
    nextNoteTime += 60 / state.bpm;
    currentBeat++;
  }
}

function start() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  currentBeat = 0;
  nextNoteTime = ctx.currentTime + 0.05;
  visualQueue.length = 0;
  scheduler();
  timerId = setInterval(scheduler, LOOKAHEAD_MS);
  state.running = true;
  els.start.textContent = 'Stop';
  els.start.classList.add('running');
  requestWakeLock();
  requestAnimationFrame(draw);
}

function stop() {
  clearInterval(timerId);
  timerId = null;
  state.running = false;
  els.start.textContent = 'Start';
  els.start.classList.remove('running');
  visualQueue.length = 0;
  highlight(-1);
  releaseWakeLock();
}

// ---------- Anzeige ----------
function renderDots() {
  els.beats.innerHTML = '';
  for (let i = 0; i < state.beats; i++) {
    const d = document.createElement('div');
    d.className = 'dot' + (i === 0 && state.accent && state.beats > 1 ? ' accent' : '');
    els.beats.appendChild(d);
  }
}

function highlight(beat) {
  [...els.beats.children].forEach((d, i) => d.classList.toggle('on', i === beat));
}

function draw() {
  if (!state.running) return;
  let beat = null;
  while (visualQueue.length && visualQueue[0].time <= ctx.currentTime) {
    beat = visualQueue.shift().beat;
  }
  if (beat !== null) highlight(beat);
  requestAnimationFrame(draw);
}

// ---------- Wake Lock (Bildschirm bleibt an) ----------
let wakeLock = null;
async function requestWakeLock() {
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* nicht unterstützt */ }
}
function releaseWakeLock() {
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.running) requestWakeLock();
});

// ---------- Bedienung ----------
els.start.addEventListener('click', () => (state.running ? stop() : start()));
els.minus.addEventListener('click', () => setBpm(state.bpm - 1));
els.plus.addEventListener('click', () => setBpm(state.bpm + 1));
els.slider.addEventListener('input', () => setBpm(+els.slider.value));

els.meter.addEventListener('change', () => {
  state.beats = +els.meter.value;
  currentBeat = 0;
  renderDots();
  save();
});
els.accent.addEventListener('change', () => {
  state.accent = els.accent.checked;
  renderDots();
  save();
});

// Tap-Tempo: Mittelwert der letzten Abstände, Reset nach 2 s Pause
let taps = [];
els.tap.addEventListener('pointerdown', () => {
  const now = performance.now();
  if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
  taps.push(now);
  if (taps.length > 6) taps.shift();
  if (taps.length >= 2) {
    const avg = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
    setBpm(60000 / avg);
  }
});

// 5er-Schritt vom Wert v aus (rastet auf Vielfache von 5 ein)
function step5(v, dir) {
  return dir > 0 ? Math.floor(v / 5) * 5 + 5 : Math.ceil(v / 5) * 5 - 5;
}

// Swiper: je weiter gezogen, desto mehr 5er-Schritte
let drag = null;
els.swiper.addEventListener('pointerdown', (e) => {
  els.swiper.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, startBpm: state.bpm, steps: 0 };
  els.swiper.classList.add('dragging');
});
els.swiper.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  els.track.style.transform = `translateX(${dx % SWIPE_PX_PER_STEP}px)`;
  const steps = Math.trunc(dx / SWIPE_PX_PER_STEP);
  if (steps === drag.steps) return;
  drag.steps = steps;
  let v = drag.startBpm;
  for (let i = 0; i < Math.abs(steps); i++) v = step5(v, Math.sign(steps));
  setBpm(v);
  navigator.vibrate?.(5);
});
const endDrag = () => {
  drag = null;
  els.swiper.classList.remove('dragging');
  els.track.style.transform = '';
};
els.swiper.addEventListener('pointerup', endDrag);
els.swiper.addEventListener('pointercancel', endDrag);
els.swiper.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setBpm(step5(state.bpm, 1)); e.preventDefault(); }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setBpm(step5(state.bpm, -1)); e.preventDefault(); }
});

// Leertaste startet/stoppt
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target.tagName !== 'BUTTON') {
    e.preventDefault();
    state.running ? stop() : start();
  }
});

// ---------- Init ----------
els.meter.value = String(state.beats);
els.accent.checked = state.accent;
setBpm(state.bpm);
renderDots();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
