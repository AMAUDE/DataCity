// Connecteur HDX (HumData) via l'API CKAN.
// Recherche les jeux CIV et télécharge la 1re ressource GeoJSON exploitable.
import { fetchJSON, fetchText, writeCollection, point } from "./lib.mjs";

const BASE = "https://data.humdata.org/api/3/action";
// Jeux ciblés (modifiable) : établissements de santé, écoles…
const QUERIES = [
  { q: "cote d'ivoire health facilities", theme: "sante" },
  { q: "cote d'ivoire education facilities", theme: "ecoles" },
];

async function run() {
  for (const { q, theme } of QUERIES) {
    const search = await fetchJSON(`${BASE}/package_search?q=${encodeURIComponent(q)}&rows=5`);
    const pkgs = search.result?.results || [];
    let picked = null, res = null;
    for (const p of pkgs) {
      res = (p.resources || []).find((r) => /geojson/i.test(r.format || ""));
      if (res) { picked = p; break; }
    }
    if (!res) { console.log(`  aucun GeoJSON pour « ${q} »`); continue; }
    const gj = JSON.parse(await fetchText(res.url));
    const feats = (gj.features || []).map((f) => {
      const p = f.properties || {};
      const c = f.geometry?.type === "Point" ? f.geometry.coordinates : null;
      return point({
        name: p.name || p.nom || p.facility_name || "Sans nom",
        featureType: p.amenity || p.type || theme,
        lng: c?.[0], lat: c?.[1], theme, source: "HDX (HumData)",
        admin1: p.admin1 || p.region || null, verified: false, props: { hdx: picked.name },
      });
    });
    writeCollection(`hdx-${theme}.geojson`, {
      dataset: `${picked.title || q} (HDX)`, source: "HDX (HumData)",
      theme, license: picked.license_id || "voir HDX", verified: false,
    }, feats);
  }
}
run().catch((e) => { console.error("Échec HDX:", e.message); process.exit(1); });
