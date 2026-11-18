import { describe, expect, it } from 'vitest';
import { loadApp } from './helpers.js';

const ACCENT = 1600;
const NORMAL = 1000;

describe('Wiedergabe', () => {
  it('Start/Stop schaltet Button und Zustand um', () => {
    const app = loadApp();
    const start = app.$('start');
    start.click();
    expect(start.textContent).toBe('Stop');
    expect(start.classList.contains('running')).toBe(true);
    start.click();
    expect(start.textContent).toBe('Start');
    expect(start.classList.contains('running')).toBe(false);
  });

  it('Leertaste startet und stoppt (außer auf Buttons)', () => {
    const app = loadApp();
    app.key(app.win.document.body, ' ', 'Space');
    expect(app.$('start').textContent).toBe('Stop');
    app.key(app.$('tap'), ' ', 'Space'); // auf einem Button: ignoriert
    expect(app.$('start').textContent).toBe('Stop');
    app.key(app.win.document.body, ' ', 'Space');
    expect(app.$('start').textContent).toBe('Start');
  });

  it('plant Klicks im Abstand 60/BPM', () => {
    const app = loadApp(); // 120 BPM → 0,5 s
    app.$('start').click();
    app.advance(2);
    const times = app.audio.clicks.map((c) => c.time);
    expect(times.length).toBeGreaterThanOrEqual(4);
    times.slice(1).forEach((t, i) => expect(t - times[i]).toBeCloseTo(0.5));
    expect(times[0]).toBeCloseTo(0.05);
  });

  it('plant nur bis SCHEDULE_AHEAD (0,1 s) voraus', () => {
    const app = loadApp();
    app.$('start').click();
    app.advance(1);
    const last = app.audio.clicks.at(-1).time;
    expect(last).toBeLessThan(app.audio.currentTime + 0.1);
  });

  it('betont Schlag 1 im 4/4-Takt', () => {
    const app = loadApp();
    app.$('start').click();
    app.advance(3.9); // 8 Schläge
    const freqs = app.audio.clicks.slice(0, 8).map((c) => c.freq);
    expect(freqs).toEqual([ACCENT, NORMAL, NORMAL, NORMAL, ACCENT, NORMAL, NORMAL, NORMAL]);
  });

  it('ohne Akzent sind alle Klicks gleich', () => {
    const app = loadApp();
    app.change(app.$('accent'), false);
    app.$('start').click();
    app.advance(3);
    expect(new Set(app.audio.clicks.map((c) => c.freq))).toEqual(new Set([NORMAL]));
  });

  it('kein Akzent im 1/4-Takt', () => {
    const app = loadApp();
    app.change(app.$('meter'), 1);
    app.$('start').click();
    app.advance(3);
    expect(new Set(app.audio.clicks.map((c) => c.freq))).toEqual(new Set([NORMAL]));
  });

  it('Tempoänderung wirkt sofort auf die nächsten Schläge', () => {
    const app = loadApp();
    app.$('start').click();
    app.advance(0.1);
    app.change(app.$('slider'), 60);
    app.advance(3);
    const times = app.audio.clicks.map((c) => c.time);
    expect(times.at(-1) - times.at(-2)).toBeCloseTo(1);
  });

  it('nach Stop werden keine Klicks mehr geplant', () => {
    const app = loadApp();
    app.$('start').click();
    app.advance(1);
    app.$('start').click();
    const n = app.audio.clicks.length;
    app.advance(5);
    expect(app.audio.clicks.length).toBe(n);
  });
});

describe('Schlaganzeige', () => {
  it('zeigt einen Punkt pro Schlag, Akzent auf dem ersten', () => {
    const app = loadApp();
    const dots = [...app.$('beats').children];
    expect(dots).toHaveLength(4);
    expect(dots.map((d) => d.classList.contains('accent'))).toEqual([true, false, false, false]);

    app.change(app.$('meter'), 7);
    expect(app.$('beats').children).toHaveLength(7);

    app.change(app.$('accent'), false);
    expect(app.$('beats').querySelector('.accent')).toBeNull();
  });

  it('1/4-Takt hat keinen Akzentpunkt', () => {
    const app = loadApp();
    app.change(app.$('meter'), 1);
    expect(app.$('beats').children).toHaveLength(1);
    expect(app.$('beats').querySelector('.accent')).toBeNull();
  });

  it('leuchtet synchron zum hörbaren Schlag', () => {
    const app = loadApp();
    app.$('start').click();
    app.frame();
    expect(app.litBeat()).toBe(-1); // erster Klick erst bei 0,05 s
    app.advance(0.06);
    app.frame();
    expect(app.litBeat()).toBe(0);
    app.advance(0.5);
    app.frame();
    expect(app.litBeat()).toBe(1);
  });

  it('löscht die Anzeige beim Stop', () => {
    const app = loadApp();
    app.$('start').click();
    app.advance(0.06);
    app.frame();
    expect(app.litBeat()).toBe(0);
    app.$('start').click();
    expect(app.litBeat()).toBe(-1);
  });

  it('blinkt im 1/4-Takt (aus nach halbem Schlag)', () => {
    const app = loadApp();
    app.change(app.$('meter'), 1);
    app.$('start').click();
    app.advance(0.06);
    app.frame();
    expect(app.litBeat()).toBe(0);
    app.advance(0.2); // < halber Schlag (0,25 s)
    app.frame();
    expect(app.litBeat()).toBe(0);
    app.advance(0.1); // > halber Schlag
    app.frame();
    expect(app.litBeat()).toBe(-1);
    app.advance(0.2); // nächster Schlag
    app.frame();
    expect(app.litBeat()).toBe(0);
  });
});
