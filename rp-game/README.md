# Carabinieri RP — Open World foundation

This branch contains an isolated game project and the first multiplayer backend. The existing Carabinieri app on `main` is not overwritten.

## Playable systems in this build
- Procedural city streets, blocks and a Carabinieri station.
- Third-person operator and patrol vehicle with mobile joystick.
- Enter/exit vehicle, siren and emergency light controls.
- Role selection, basic duty toggle and location interaction prompts.
- Multiplayer client integration for player movement, profile, duty state and chat.

## Multiplayer server
The Colyseus server is in `server/`, with a city room for up to 48 connected clients. It is source code only until deployed. A public WebSocket server URL is required in the in-game multiplayer panel.

### Deploy
A Render Blueprint file is included at `render.yaml`. Import this repository in Render and deploy the blueprint. After deployment, copy the public service URL and enter it in the game panel using `wss://` (or `ws://` for local development).

## Important limitations
This is an early playable foundation, not a finished State on RP-scale game. The city and player/vehicle meshes are placeholders. The multiplayer room is a first connection layer, not production-ready: authentication, database persistence, anti-cheat, proximity chat, moderation, vehicle replication, advanced physics, interiors, high-quality licensed assets, animations, traffic AI, missions and full progression still need implementation and testing. No live server has been deployed from this repository yet.
