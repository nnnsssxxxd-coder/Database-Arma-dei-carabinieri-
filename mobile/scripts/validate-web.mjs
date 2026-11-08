import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const html = await readFile(new URL("../www/index.html", import.meta.url), "utf8");
const requiredIds = ["loginForm", "password", "appView", "tabs", "settings", "musicYes", "musicNo", "musicPlayer"];
const missing = requiredIds.filter(id => !html.includes('id="' + id + '"') && !html.includes("id='" + id + "'"));
if (missing.length) throw new Error("Elementi essenziali mancanti nell'app: " + missing.join(", "));

const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes));
if (!scripts.length) throw new Error("Nessuno script applicativo trovato.");
for (let i = 0; i < scripts.length; i++) {
  new Script(scripts[i][2], { filename: "index.html:inline-script-" + (i + 1) });
}

if (/<button\b(?=[^>]*\bdata-tab=["']gps["'])/i.test(html)) {
  throw new Error("La scheda GPS risulta ancora presente nella navigazione.");
}
console.log("Controlli superati: elementi essenziali presenti, JavaScript valido, scheda GPS assente.");
