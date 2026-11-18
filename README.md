# Metronom (PWA)

Einfaches, installierbares Metronom – Vanilla HTML/CSS/JS, kein Build-Schritt.

- Tempo 30–250 BPM: Slider, ±1-Buttons, Wischfeld (5er-Schritte, rastet auf Vielfache von 5 ein)
- Tap-Tempo, Taktart (1/4–7/8), Akzent auf Schlag 1, visuelle Schlaganzeige
- Offline-fähig (Service Worker), Bildschirm bleibt beim Spielen an (Wake Lock)

## Lokal starten

```sh
python3 -m http.server 8000
```

## Deployment

GitHub Pages via `.github/workflows/pages.yml` (bei Push auf `main`).
Einmalig in den Repo-Einstellungen: *Settings → Pages → Source: GitHub Actions*.

## Version

Die Version steht in `version.js` und wird in der App unten angezeigt.
Bei jeder Änderung erhöhen – dadurch lädt der Service Worker die neuen Dateien in den Cache,
und in bereits geöffneten Apps erscheint der Hinweis „Neue Version verfügbar – tippen zum Neuladen“.
