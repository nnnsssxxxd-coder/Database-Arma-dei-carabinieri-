# Carabinieri RP multiplayer server

This is the first server-side multiplayer foundation for the game.

- Colyseus room: `italian_city`
- Up to 48 connected clients per room
- Server-owned player profiles, position, vehicle flag and duty state
- Basic proximity-ready global chat broadcast (proximity filtering is a future task)
- Basic input clamping on movement

## Run
Requires Node.js LTS. In this folder run `npm install`, then `npm start`.

Set the hosting provider's `PORT` environment variable if required. The game client still needs the public WebSocket endpoint configured before players can connect over the internet.

## Important
This is a starter multiplayer backend, not yet production-secure or a deployed live service. It still needs account authentication, persistent database storage, rate limiting, moderation, monitoring, anti-cheat, and a public host.
