import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { CityRoom } from "./city-room.js";

const port = Number(process.env.PORT || 2567);
const gameServer = new Server({ transport: new WebSocketTransport() });
gameServer.define("italian_city", CityRoom);
gameServer.listen(port);
console.log(`Carabinieri RP server listening on port ${port}`);
