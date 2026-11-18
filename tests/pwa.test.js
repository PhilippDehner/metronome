import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadApp, read } from './helpers.js';

const swAssets = () => {
  const src = read('sw.js');
  const list = src.match(/const ASSETS = \[([\s\S]*?)\];/)[1];
  return [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((a) => a !== './');
};

describe('PWA / Version', () => {
  it('zeigt die Version aus version.js an', () => {
    const app = loadApp();
    expect(app.$('version').textContent).toBe(app.win.APP_VERSION);
    expect(app.win.APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('alle vom Service Worker gecachten Dateien existieren', () => {
    for (const asset of swAssets()) {
      expect(existsSync(new URL(`../${asset}`, import.meta.url)), asset).toBe(true);
    }
  });

  it('alle gecachten Dateien werden auch deployt', () => {
    const workflow = read('.github/workflows/ci.yml');
    for (const asset of swAssets()) {
      const top = asset.split('/')[0];
      expect(workflow.includes(top), asset).toBe(true);
    }
    expect(workflow).toContain('sw.js');
  });

  it('Manifest ist gültig und verweist auf vorhandene Icons', () => {
    const manifest = JSON.parse(read('manifest.webmanifest'));
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    for (const icon of manifest.icons) {
      expect(existsSync(new URL(`../${icon.src}`, import.meta.url)), icon.src).toBe(true);
    }
  });
});
