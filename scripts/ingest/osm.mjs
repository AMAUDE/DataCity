// Connecteur OpenStreetMap via l'API Overpass.
// Récupère les équipements publics de Côte d'Ivoire par thématique.
// Fonctionne partout où overpass-api.de est joignable.
import { fetchJSON, writeCollection, point } from "./lib.mjs";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// thème -> filtres Overpass (clé=valeur) + type interne
const THEMES = {
  ecoles: { types: ["school", "college", "university", "kindergarten"], key: "amenity", ft: (v) => v },
  sante: { types: ["hospital", "clinic", "doctors", "pharmacy"], key: "amenity", ft: (v) => v },
  securite: { types: ["police"], key: "amenity", ft: () => "police" },
  finance: { types: ["bank", "bureau_de_change"], key: "amenity", ft: (v) => v },
  justice: { types: ["courthouse", "prison"], key: "amenity", ft: (v) => v },
  administration: { types: ["townhall"], key: "amenity", ft: () => "mairie" },
};
const PER_THEME = 300;

function buildQuery(key, values) {
  const filters = values.map((v) =>
    `node["${key}"="${v}"](area.a);way["${key}"="${v}"](area.a);`).join("");
  return `[out:json][timeout:90];area["ISO3166-1"="CI"][admin_level=2]->.a;(${filters});out center tags ${PER_THEME};`;
}

async function overpass(query) {
  let lastErr;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, { method: "POST", body: "data=" + encodeURIComponent(query),
        headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

async function run() {
  for (const [theme, cfg] of Object.entries(THEMES)) {
    const data = await overpass(buildQuery(cfg.key, cfg.types));
    const feats = [];
    for (const el of data.elements || []) {
      const lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon;
      if (lat == null || lng == null) continue;
      const t = el.tags || {};
      feats.push(point({
        name: t.name || t["name:fr"] || `${cfg.ft(t[cfg.key])} sans nom`,
        featureType: cfg.ft(t[cfg.key]),
        lng, lat, theme, source: "OpenStreetMap", admin1: t["addr:city"] || null,
        verified: false, props: { osm_id: el.id, operator: t.operator },
      }));
    }
    writeCollection(`osm-${theme}.geojson`, {
      dataset: `${theme} (OpenStreetMap) — Côte d'Ivoire`,
      source: "OpenStreetMap", theme, license: "ODbL 1.0", verified: false,
    }, feats);
  }
}
run().catch((e) => { console.error("Échec OSM/Overpass:", e.message); process.exit(1); });
