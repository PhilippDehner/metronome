import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const root = new URL('../', import.meta.url);
export const read = (file) => readFileSync(new URL(file, root), 'utf8');

// Minimaler AudioContext-Ersatz: protokolliert jeden Klick (Zeit + Frequenz)
class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {};
    this.clicks = [];
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  createGain() {
    const param = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
    return { gain: param, connect: (n) => n };
  }
  createOscillator() {
    const osc = {
      frequency: { value: 0 },
      connect: (n) => n,
      start: (time) => this.clicks.push({ time, freq: osc.frequency.value }),
      stop() {},
    };
    return osc;
  }
}

/**
 * Lädt index.html + version.js + app.js in eine frische jsdom-Umgebung.
 * Timer, rAF, performance.now und AudioContext sind steuerbar.
 */
export function loadApp({ storage } = {}) {
  const dom = new JSDOM(read('index.html'), { runScripts: 'outside-only', url: 'http://localhost/' });
  const win = dom.window;

  if (storage !== undefined) win.localStorage.setItem('metronome', storage);

  const intervals = [];
  win.setInterval = (fn) => { intervals.push(fn); return intervals.length; };
  win.clearInterval = (id) => { intervals[id - 1] = null; };

  let frame = null;
  win.requestAnimationFrame = (fn) => { frame = fn; return 1; };

  let now = 0;
  Object.defineProperty(win.performance, 'now', { value: () => now, configurable: true });

  let audio = null;
  win.AudioContext = class extends FakeAudioContext {
    constructor() { super(); audio = this; }
  };

  win.HTMLElement.prototype.setPointerCapture = () => {};
  win.navigator.vibrate = () => true;

  win.eval(read('version.js'));
  win.eval(read('app.js'));

  const $ = (id) => win.document.getElementById(id);

  return {
    win,
    $,
    get audio() { return audio; },
    bpm: () => Number($('bpm-value').textContent),
    saved: () => JSON.parse(win.localStorage.getItem('metronome')),
    setNow: (t) => { now = t; },
    // Audiozeit vorspulen und Scheduler-Intervall ausführen
    advance(seconds) {
      audio.currentTime += seconds;
      intervals.forEach((fn) => fn && fn());
    },
    // Einen Animationsframe zeichnen
    frame() { const fn = frame; frame = null; fn?.(); },
    pointer(el, type, clientX = 0) {
      el.dispatchEvent(new win.MouseEvent(type, { bubbles: true, clientX }));
    },
    key(el, key, code = key) {
      el.dispatchEvent(new win.KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true }));
    },
    change(el, value) {
      if (el.type === 'checkbox') el.checked = value; else el.value = String(value);
      el.dispatchEvent(new win.Event(el.type === 'range' ? 'input' : 'change', { bubbles: true }));
    },
    litBeat: () => [...$('beats').children].findIndex((d) => d.classList.contains('on')),
  };
}
