# Carabinieri RP — Open World foundation

This is a first playable browser-based 3D foundation in a separate branch. It is intentionally isolated from the existing Carabinieri app.

## Run
Open `index.html` through a static web server or a GitHub Pages preview. Babylon.js is loaded from its official CDN, so an internet connection is required.

## Current slice
- Procedural Italian-style urban block and a simple Carabinieri station.
- Third-person operator and patrol vehicle.
- Mobile touch joystick, keyboard movement, enter/exit vehicle, emergency lights and siren toggle.
- Responsive HUD designed for phone screens.

## Not yet implemented
This is not yet a State on RP-scale multiplayer game. It does not yet have real 3D character/vehicle assets, interior exploration, server-authoritative multiplayer, accounts, persistence, voice/radio backend, or production physics. Those need separate art, backend, and testing work.

## Next milestones
1. Replace placeholder geometry with optimized licensed GLB assets and rigged character animations.
2. Add proper collision/vehicle physics and interactable interiors.
3. Add a server-authoritative multiplayer layer (Babylon.js networking examples use Colyseus).
4. Add account, character, rank and duty persistence; later connect to the existing Carabinieri app through a carefully scoped API.
5. Profile and optimize on Android devices.
