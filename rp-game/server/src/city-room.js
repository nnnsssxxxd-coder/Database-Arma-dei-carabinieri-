import { Room } from "colyseus";
import { GameState, Player } from "./state.js";

const WORLD_LIMIT = 120;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const cleanName = (value) => String(value || "Operatore")
  .normalize("NFC")
  .replace(/[^a-zA-ZÀ-ÿ0-9 _-]/g, "")
  .trim()
  .slice(0, 20) || "Operatore";

export class CityRoom extends Room {
  maxClients = 48;
  maxMessagesPerSecond = 20;
  state = new GameState();

  // Server-side movement history and chat throttling are deliberately not
  // synchronized to clients.
  movement = new Map();
  chatTimes = new Map();

  onCreate() {
    this.onMessage("move", (client, data = {}) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !finite(data.x) || !finite(data.z) || !finite(data.rotation)) return;

      const now = Date.now();
      const previous = this.movement.get(client.sessionId) || {
        x: player.x, z: player.z, at: now
      };
      const elapsed = Math.max(0.05, Math.min((now - previous.at) / 1000, 0.5));
      const maxSpeed = data.vehicle === true ? 30 : 7;
      const dx = clamp(data.x, -WORLD_LIMIT, WORLD_LIMIT) - previous.x;
      const dz = clamp(data.z, -WORLD_LIMIT, WORLD_LIMIT) - previous.z;
      const distance = Math.hypot(dx, dz);

      // Reject implausible teleports instead of trusting client coordinates.
      if (distance > maxSpeed * elapsed + 3) return;

      player.x = clamp(data.x, -WORLD_LIMIT, WORLD_LIMIT);
      player.y = 0;
      player.z = clamp(data.z, -WORLD_LIMIT, WORLD_LIMIT);
      player.rotation = Math.atan2(Math.sin(data.rotation), Math.cos(data.rotation));
      player.vehicle = data.vehicle === true;

      this.movement.set(client.sessionId, { x: player.x, z: player.z, at: now });
    });

    this.onMessage("profile", (client, data = {}) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const allowedRoles = new Set(["Cittadino", "Carabiniere"]);
      player.name = cleanName(data.name);
      player.role = allowedRoles.has(data.role) ? data.role : "Cittadino";
      player.rank = player.role === "Carabiniere" ? "Carabiniere" : "Civile";
      if (player.role !== "Carabiniere") player.onDuty = false;
    });

    this.onMessage("duty", (client, data = {}) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.role !== "Carabiniere") return;
      player.onDuty = data.active === true;
      this.broadcast("system", {
        message: player.onDuty
          ? `${player.name} ha iniziato il servizio.`
          : `${player.name} ha terminato il servizio.`
      });
    });

    this.onMessage("chat", (client, data = {}) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const now = Date.now();
      const last = this.chatTimes.get(client.sessionId) || 0;
      if (now - last < 1000) return;
      this.chatTimes.set(client.sessionId, now);

      const message = String(data.message || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 180);
      if (message) {
        this.broadcast("chat", {
          name: player.name,
          role: player.role,
          message,
          at: now
        });
      }
    });
  }

  onJoin(client) {
    this.state.players.set(client.sessionId, new Player());
    this.movement.set(client.sessionId, { x: 0, z: 0, at: Date.now() });
    this.broadcast("system", { message: "Un nuovo giocatore è entrato in città." });
  }

  onLeave(client) {
    const player = this.state.players.get(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.movement.delete(client.sessionId);
    this.chatTimes.delete(client.sessionId);
    if (player) this.broadcast("system", { message: `${player.name} ha lasciato la città.` });
  }
}
