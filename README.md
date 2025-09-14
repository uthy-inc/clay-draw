# Clay Draw — Claymorphic Canvas PWA

Live Preview
- Launch the app: https://uthy-inc.github.io/clay-draw/
- First deployment may take 1–2 minutes after a push to main. If you see a 404, wait a bit and refresh.

What is this?
- A fast, claymorphism-styled drawing app with keyboard shortcuts, multi-tool canvas, and a world timecards panel.
- It’s a Progressive Web App (PWA): works offline after first load, and can be installed on desktop/mobile.

How to use
- Drawing tools: Press keys to switch tools quickly
  - P: Pen  •  B: Brush  •  E: Eraser  •  R: Rectangle  •  C: Circle  •  T: Text  •  V: Select  •  Space: Hold to pan
- Colors: Palette initializes on load. Click a color to set active color.
- World timecards: Open the time panel and add zones. Cards render progressively and only update when visible for smoother performance.
- Undo/Redo: Use the on-screen history controls.

PWA behavior
- First visit online so the service worker can cache assets.
- Offline support: After the first successful load, you can reopen the app without a network connection.
- Updates: If you don’t see new features immediately, refresh. Major updates may require a hard refresh (Ctrl/Cmd + Shift + R).

Local development (optional)
- Any static server works. Examples:
  - Python 3: python -m http.server 5173
  - Node (serve): npx serve -l 5173
- Then open http://localhost:5173/
- Note: Service workers only work when served over http(s), not from file://

Deployment
- GitHub Pages is configured via GitHub Actions. Pushing to main triggers an automatic deploy.
- Workflow: .github/workflows/deploy-pages.yml
- Pages URL: https://uthy-inc.github.io/clay-draw/

Project structure
- index.html — app shell and PWA wiring
- css/styles.css — claymorphism styles
- js/* — canvas engine, tools, colors, PWA, world clocks
- manifest.webmanifest — PWA metadata
- sw.js — service worker cache (versioned)
- icons/ — app icons and social SVGs

License
- MIT (or update as needed).