import { describe, expect, it } from 'vitest';
import { loadApp } from './helpers.js';

describe('Speichern', () => {
  it('übernimmt gespeicherte Einstellungen', () => {
    const app = loadApp({ storage: JSON.stringify({ bpm: 90, beats: 3, accent: false }) });
    expect(app.bpm()).toBe(90);
    expect(app.$('meter').value).toBe('3');
    expect(app.$('accent').checked).toBe(false);
    expect(app.$('beats').children).toHaveLength(3);
  });

  it('begrenzt und rundet gespeichertes Tempo', () => {
    expect(loadApp({ storage: JSON.stringify({ bpm: 999 }) }).bpm()).toBe(250);
    expect(loadApp({ storage: JSON.stringify({ bpm: 5 }) }).bpm()).toBe(30);
    expect(loadApp({ storage: JSON.stringify({ bpm: 99.6 }) }).bpm()).toBe(100);
  });

  it('ignoriert ungültige Daten', () => {
    const app = loadApp({ storage: '{kaputt' });
    expect(app.bpm()).toBe(120);
    expect(app.$('meter').value).toBe('4');
    expect(app.$('accent').checked).toBe(true);
  });

  it('speichert Änderungen an Tempo, Schläge und Akzent', () => {
    const app = loadApp();
    app.$('plus').click();
    app.change(app.$('meter'), 6);
    app.change(app.$('accent'), false);
    expect(app.saved()).toEqual({ bpm: 121, beats: 6, accent: false });
  });
});
