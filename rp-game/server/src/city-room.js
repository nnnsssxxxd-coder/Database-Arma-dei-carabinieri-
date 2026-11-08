import { Room } from "colyseus";
import { Player } from "./state.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export class CityRoom extends Room {
  maxClients = 48;
  state = new (await import("./state.js")).GameState();

  onCreate() {
    this.onMessage("move", (client, data = {}) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.x = clamp(data.x, -120, 120);
      player.y = 0;
      player.z = clamp(data.z, -120, 120);
      player.rotation = clamp(data.rotation, -Math.PI * 20, Math.PI * 20);
      player.vehicle = Boolean(data.vehicle);
    });

    this.onMessage("profile", (client, data = {}) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const allowedRoles = ["Cittadino", "Carabiniere"];
      player.name = String(data.name || "Operatore").replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, "").slice(0, 20) || "Operatore";
      player.role = allowedRoles.includes(data.role) ? data.role : "Cittadino";
      player.rank = player.role === "Carabiniere" ? "Carabiniere" : "Civile";
    });

    this.onMessage("duty", (client, data = {}) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.role !== "Carabiniere") return;
      player.onDuty = Boolean(data.active);
    });

    this.onMessage("chat", (client, data = {}) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const message = String(data.message || "").trim().slice(0, 180);
      if (!message) return;
      this.broadcast("chat", { name: player.name, message, at: Date.now() });
    });
  }

  onJoin(client) {
    this.state.players.set(client.sessionId, new Player());
    this.broadcast("system", { message: "Un nuovo giocatore è entrato in città." });
  }

  onLeave(client) {
    this.state.players.delete(client.sessionId);
    this.broadcast("system", { message: "Un giocatore ha lasciato la città." });
  }
}
