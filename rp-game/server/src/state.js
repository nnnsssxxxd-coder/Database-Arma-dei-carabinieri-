import { schema, t } from "@colyseus/schema";

export const Player = schema({
  x: t.number().default(0),
  y: t.number().default(0),
  z: t.number().default(0),
  rotation: t.number().default(0),
  name: t.string().default("Operatore"),
  role: t.string().default("Cittadino"),
  rank: t.string().default("Civile"),
  vehicle: t.boolean().default(false),
  onDuty: t.boolean().default(false)
});

export const GameState = schema({
  players: t.map(Player)
});
