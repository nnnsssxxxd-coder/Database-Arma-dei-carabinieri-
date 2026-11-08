import { readFile, writeFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(packageJson.version);
if (!match) throw new Error("Versione app non valida: usare MAJOR.MINOR.PATCH.");
const major = Number(match[1]);
const minor = Number(match[2]);
const patch = Number(match[3]);
const versionCode = major * 1_000_000 + minor * 1_000 + patch;
const gradlePath = new URL("../android/app/build.gradle", import.meta.url);
let gradle = await readFile(gradlePath, "utf8");
if (!/versionCode\s+\d+/.test(gradle) || !/versionName\s+["'][^"']+["']/.test(gradle)) {
  throw new Error("Configurazione versionCode/versionName non trovata nel file Gradle.");
}
gradle = gradle.replace(/versionCode\s+\d+/, "versionCode " + versionCode);
gradle = gradle.replace(/versionName\s+["'][^"']+["']/, 'versionName "' + packageJson.version + '"');
await writeFile(gradlePath, gradle);
console.log("Versione Android configurata: " + packageJson.version + " (code " + versionCode + ").");
