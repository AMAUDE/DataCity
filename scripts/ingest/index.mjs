// Lance tous les connecteurs de sources disponibles.
// Chaque connecteur écrit un fichier dans data/ingested/ ; relancez ensuite
// « npm run db:seed » (ou npm run setup) pour charger ces données.
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const connectors = ["worldbank", "osm", "hdx", "geoportails", "fao", "divagis"];
const only = process.argv.slice(2);
const list = only.length ? only : connectors;

for (const c of list) {
  console.log(`\n── ${c} ──`);
  const r = spawnSync(process.execPath, [join(here, `${c}.mjs`)], { stdio: "inherit" });
  if (r.status !== 0) console.log(`  (${c} a échoué — source probablement injoignable ici)`);
}
console.log("\nTerminé. Rechargez la base : npm run db:seed");
