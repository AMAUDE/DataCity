// Connecteur FAO (FAOSTAT) — indicateurs agricoles/environnementaux nationaux.
// API : https://fenixservices.fao.org/faostat/api/v1/en/data/{domain}
// Renvoie des indicateurs rattachés au point national (thème « indicateurs »).
import { fetchJSON, writeCollection, point } from "./lib.mjs";

const CI = { lng: -5.55, lat: 7.54, code: 107 }; // 107 = code FAOSTAT Côte d'Ivoire
// domaine, élément, item, libellé
const INDICATORS = [
  { domain: "RL", element: 5110, item: 6621, name: "Superficie des terres agricoles", unit: "1000 ha" },
  { domain: "GF", element: 5110, item: 6717, name: "Superficie forestière", unit: "1000 ha" },
];

async function run() {
  const feats = [];
  for (const ind of INDICATORS) {
    try {
      const url = `https://fenixservices.fao.org/faostat/api/v1/en/data/${ind.domain}` +
        `?area=${CI.code}&element=${ind.element}&item=${ind.item}&year_range=2015:2023` +
        `&output_type=objects`;
      const data = await fetchJSON(url);
      const rows = (data.data || []).map((r) => ({ year: +r.Year, value: +r.Value }))
        .filter((r) => Number.isFinite(r.value)).sort((a, b) => a.year - b.year);
      if (!rows.length) continue;
      const latest = rows[rows.length - 1];
      feats.push(point({
        name: `${ind.name} — Côte d'Ivoire`, featureType: "indicateur",
        lng: CI.lng, lat: CI.lat, theme: "indicateurs", source: "FAO",
        admin1: "National", verified: true,
        props: { annee: latest.year, valeur: latest.value, unite: ind.unit, domaine: ind.domain },
      }));
    } catch (e) { console.log(`  FAO ${ind.name} indisponible : ${e.message}`); }
  }
  writeCollection("fao.geojson", { dataset: "Indicateurs FAO — Côte d'Ivoire",
    source: "FAO", theme: "indicateurs", license: "CC BY 4.0", verified: true }, feats);
}
run().catch((e) => { console.error("Échec FAO:", e.message); process.exit(1); });
