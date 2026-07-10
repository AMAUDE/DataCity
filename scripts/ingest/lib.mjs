// Utilitaires communs aux connecteurs de sources.
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

export const INGEST_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "ingested");

export async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  return res.json();
}
export async function fetchText(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  return res.text();
}

// Écrit une FeatureCollection normalisée que le seed sait charger.
// meta = { dataset, source, theme, license, verified }
export function writeCollection(fileName, meta, features) {
  const fc = {
    type: "FeatureCollection",
    metadata: meta,
    features,
  };
  const path = join(INGEST_DIR, fileName);
  writeFileSync(path, JSON.stringify(fc));
  console.log(`✔ ${fileName} : ${features.length} entités (${meta.source})`);
  return path;
}

// Construit une Feature ponctuelle normalisée.
export function point({ name, featureType, lng, lat, theme, source, admin1, verified = false, props = {} }) {
  return {
    type: "Feature",
    geometry: lng != null && lat != null ? { type: "Point", coordinates: [lng, lat] } : null,
    properties: { name, featureType, theme, source, admin1: admin1 || null, verified, ...props },
  };
}
