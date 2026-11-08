import { readFile, readdir } from "node:fs/promises";
import { Script } from "node:vm";

const html = await readFile(new URL("../www/index.html", import.meta.url), "utf8");
const requiredIds = ["loginForm", "password", "appView", "tabs", "settings", "musicYes", "musicNo", "musicPlayer"];
const missing = requiredIds.filter(id => !html.includes('id="' + id + '"') && !html.includes("id='" + id + "'"));
if (missing.length) throw new Error("Elementi essenziali mancanti nell'app: " + missing.join(", "));

const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes));
if (!scripts.length) throw new Error("Nessuno script applicativo trovato.");
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(([, id]) => id);
if (new Set(ids).size !== ids.length) throw new Error("Sono presenti ID HTML duplicati.");

const idSet = new Set(ids);
const referencedIds = [...html.matchAll(/\$\(["']([^"']+)["']\)/g)].map(([, id]) => id);
const missingRefs = [...new Set(referencedIds.filter(id => !idSet.has(id)))];
if (missingRefs.length) throw new Error("Riferimenti DOM senza elemento: " + missingRefs.join(", "));

for (const invariant of [
  'personnelRole=isSubOfficer?"OPERATORE":"UFFICIALE"',
  'textContent=isCommander?DEPARTMENT_RANKS[7]:DEPARTMENT_RANKS[r]',
  'commandBoard=null;commandExamAttempt=null'
]) {
  if (!html.includes(invariant)) throw new Error("Controllo funzionale non superato: " + invariant);
}

for (let i = 0; i < scripts.length; i++) {
  new Script(scripts[i][2], { filename: "index.html:inline-script-" + (i + 1) });
}

if (/<button\b(?=[^>]*\bdata-tab=["']gps["'])/i.test(html)) {
  throw new Error("La scheda GPS risulta ancora presente nella navigazione.");
}
const functionsRoot = new URL("../../supabase/functions/", import.meta.url);
for (const entry of await readdir(functionsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const sourceUrl = new URL(entry.name + "/index.ts", functionsRoot);
  let source;
  try { source = await readFile(sourceUrl, "utf8"); } catch { continue; }
  if (!/function\s+reply\s*\(\s*req\s*:\s*Request/i.test(source)) continue;
  for (const [index, line] of source.split("\n").entries()) {
    if (/function\s+reply\s*\(/.test(line)) continue;
    const match = line.match(/\breply\s*\(([^,\n)]*)/);
    if (match && match[1].trim() !== "req") {
      throw new Error(entry.name + "/index.ts:" + (index + 1) + " usa reply() senza passare Request come primo argomento.");
    }
  }
}

console.log("Controlli superati: elementi essenziali presenti, JavaScript valido, scheda GPS assente.");
