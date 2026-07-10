// Connecteur générique OGC WFS pour les géoportails ivoiriens.
// La plupart exposent un service WFS (GetFeature en GeoJSON). Renseignez
// l'URL de base et la couche (typeName) de chaque portail ci-dessous.
import { writeCollection, point, fetchJSON } from "./lib.mjs";

// À confirmer/compléter avec les couches réelles publiées par chaque portail.
const PORTALS = [
  { source: "Géoportail ANSTAT", base: "https://geoportail.anstat.ci/geoserver/ows", layers: [
    { typeName: "anstat:etablissements_scolaires", theme: "ecoles" },
    { typeName: "anstat:etablissements_sante", theme: "sante" },
  ]},
  { source: "CNTIG", base: "https://geoportail.cntig.ci/geoserver/ows", layers: [
    { typeName: "cntig:infrastructures_administratives", theme: "administration" },
  ]},
  { source: "BNETD", base: "https://geoserver.bnetd.ci/geoserver/ows", layers: [
    { typeName: "bnetd:equipements", theme: "administration" },
  ]},
  { source: "OpenData gouv.ci", base: "https://data.gouv.ci/geoserver/ows", layers: [
    { typeName: "opendata:infrastructures", theme: "administration" },
  ]},
];

function wfsUrl(base, typeName) {
  const q = new URLSearchParams({ service: "WFS", version: "2.0.0", request: "GetFeature",
    typeNames: typeName, outputFormat: "application/json", srsName: "EPSG:4326", count: "1000" });
  return `${base}?${q}`;
}

async function run() {
  for (const portal of PORTALS) {
    for (const layer of portal.layers) {
      try {
        const gj = await fetchJSON(wfsUrl(portal.base, layer.typeName));
        const feats = (gj.features || []).map((f) => {
          const p = f.properties || {};
          const c = f.geometry?.type === "Point" ? f.geometry.coordinates : null;
          return point({ name: p.nom || p.name || p.libelle || "Sans nom",
            featureType: p.type || layer.theme, lng: c?.[0], lat: c?.[1],
            theme: layer.theme, source: portal.source, admin1: p.region || p.district || null,
            verified: true, props: {} });
        });
        writeCollection(`${portal.source.replace(/\W+/g,"_").toLowerCase()}-${layer.theme}.geojson`,
          { dataset: `${layer.typeName} (${portal.source})`, source: portal.source,
            theme: layer.theme, license: "Données publiques", verified: true }, feats);
      } catch (e) {
        console.log(`  ${portal.source} / ${layer.typeName} indisponible : ${e.message}`);
      }
    }
  }
}
run().catch((e) => { console.error("Échec géoportails:", e.message); process.exit(1); });
