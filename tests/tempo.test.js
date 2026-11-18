import { describe, expect, it } from 'vitest';
import { loadApp } from './helpers.js';

describe('Tempo', () => {
  it('startet mit 120 BPM und synchronisiert alle Anzeigen', () => {
    const app = loadApp();
    expect(app.bpm()).toBe(120);
    expect(app.$('slider').value).toBe('120');
    expect(app.$('swiper').getAttribute('aria-valuenow')).toBe('120');
  });

  it('ändert das Tempo mit ±1-Buttons', () => {
    const app = loadApp();
    app.$('plus').click();
    app.$('plus').click();
    expect(app.bpm()).toBe(122);
    app.$('minus').click();
    expect(app.bpm()).toBe(121);
  });

  it('übernimmt den Slider-Wert', () => {
    const app = loadApp();
    app.change(app.$('slider'), 87);
    expect(app.bpm()).toBe(87);
    expect(app.$('swiper').getAttribute('aria-valuenow')).toBe('87');
  });

  it('begrenzt das Tempo auf 30–250', () => {
    const app = loadApp({ storage: JSON.stringify({ bpm: 250 }) });
    app.$('plus').click();
    expect(app.bpm()).toBe(250);

    const low = loadApp({ storage: JSON.stringify({ bpm: 30 }) });
    low.$('minus').click();
    expect(low.bpm()).toBe(30);
  });
});

describe('Wischfeld (5er-Schritte)', () => {
  it('rastet per Pfeiltaste auf Vielfache von 5 ein', () => {
    const app = loadApp({ storage: JSON.stringify({ bpm: 123 }) });
    const swiper = app.$('swiper');
    app.key(swiper, 'ArrowRight');
    expect(app.bpm()).toBe(125);
    app.key(swiper, 'ArrowUp');
    expect(app.bpm()).toBe(130);
    app.key(swiper, 'ArrowLeft');
    app.key(swiper, 'ArrowDown');
    expect(app.bpm()).toBe(120);
  });

  it('rastet auch abwärts von krummen Werten ein', () => {
    const app = loadApp({ storage: JSON.stringify({ bpm: 123 }) });
    app.key(app.$('swiper'), 'ArrowLeft');
    expect(app.bpm()).toBe(120);
  });

  it('macht je 24 px Wischweg einen 5er-Schritt', () => {
    const app = loadApp({ storage: JSON.stringify({ bpm: 121 }) });
    const swiper = app.$('swiper');
    app.pointer(swiper, 'pointerdown', 100);
    app.pointer(swiper, 'pointermove', 110);
    expect(app.bpm()).toBe(121); // noch kein voller Schritt
    app.pointer(swiper, 'pointermove', 124);
    expect(app.bpm()).toBe(125);
    app.pointer(swiper, 'pointermove', 172);
    expect(app.bpm()).toBe(135);
    app.pointer(swiper, 'pointermove', 52);
    expect(app.bpm()).toBe(115); // zurück über den Startpunkt: -2 Schritte von 121
    app.pointer(swiper, 'pointerup');
    expect(swiper.classList.contains('dragging')).toBe(false);
    app.pointer(swiper, 'pointermove', 500);
    expect(app.bpm()).toBe(115); // nach dem Loslassen keine Änderung
  });
});

describe('Tap-Tempo', () => {
  const tap = (app, t) => {
    app.setNow(t);
    app.pointer(app.$('tap'), 'pointerdown');
  };

  it('berechnet das Tempo aus den Tap-Abständen', () => {
    const app = loadApp();
    tap(app, 1000);
    expect(app.bpm()).toBe(120); // ein Tap allein ändert nichts
    tap(app, 1500);
    expect(app.bpm()).toBe(120);
    tap(app, 2100);
    tap(app, 2700);
    expect(app.bpm()).toBe(106); // Mittel 1700 ms / 3 ≈ 566,7 ms → 105,9 BPM, gerundet
  });

  it('beginnt nach mehr als 2 s Pause neu', () => {
    const app = loadApp();
    tap(app, 0);
    tap(app, 1000); // 60 BPM
    expect(app.bpm()).toBe(60);
    tap(app, 4000); // Pause > 2 s → Reset, nur ein Tap
    expect(app.bpm()).toBe(60);
    tap(app, 4250);
    expect(app.bpm()).toBe(240);
  });

  it('verwendet höchstens die letzten 6 Taps', () => {
    const app = loadApp();
    [0, 1000, 2000].forEach((t) => tap(app, t)); // 60 BPM
    [2500, 3000, 3500, 4000, 4500].forEach((t) => tap(app, t)); // 120 BPM
    // Fenster: 2000…4500 → 500 ms Abstand
    expect(app.bpm()).toBe(120);
  });
});
