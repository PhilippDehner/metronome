# Metronom (PWA)

Einfaches, installierbares Metronom – Vanilla HTML/CSS/JS, kein Build-Schritt.

- Tempo 30–250 BPM: Slider, ±1-Buttons, Wischfeld (5er-Schritte, rastet auf Vielfache von 5 ein)
- Tap-Tempo, Schläge pro Takt (1–8), Akzent auf Schlag 1, visuelle Schlaganzeige
- Offline-fähig (Service Worker), Bildschirm bleibt beim Spielen an (Wake Lock)

## Lokal starten

```sh
python3 -m http.server 8000
```

## Tests

Vitest + jsdom: Die Tests laden die echte `index.html` mit `app.js` (AudioContext, Timer und Zeit gemockt).

```sh
npm install
npm test
```

## Deployment

Die CI (`.github/workflows/ci.yml`) testet jeden Push und veröffentlicht `main` auf GitHub Pages –
nur wenn die Tests grün sind.
Einmalig in den Repo-Einstellungen: *Settings → Pages → Source: GitHub Actions*.

## Version

Die Version steht in `version.js` und wird in der App unten angezeigt.
Bei jeder Änderung erhöhen – dadurch lädt der Service Worker die neuen Dateien in den Cache,
und in bereits geöffneten Apps erscheint der Hinweis „Neue Version verfügbar – tippen zum Neuladen“.
