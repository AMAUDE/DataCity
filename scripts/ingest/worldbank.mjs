// Connecteur Banque Mondiale.
// Source primaire : API officielle https://api.worldbank.org/v2 (JSON).
// Repli : miroir open-data GitHub (github.com/datasets) — utilisé si l'API
// n'est pas joignable (ex. réseau restreint).
import { fetchJSON, fetchText, writeCollection, point } from "./lib.mjs";

const CI = { lng: -5.55, lat: 7.54 };
const INDICATORS = [
  { code: "SP.POP.TOTL", name: "Population totale", unit: "habitants", mirror: "https://raw.githubusercontent.com/datasets/population/main/data/population.csv" },
  { code: "NY.GDP.MKTP.CD", name: "PIB (USD courants)", unit: "USD", mirror: "https://raw.githubusercontent.com/datasets/gdp/main/data/gdp.csv" },
];

async function fromApi(code) {
  const url = `https://api.worldbank.org/v2/country/CIV/indicator/${code}?format=json&per_page=100`;
  const data = await fetchJSON(url);
  const rows = (data[1] || []).filter((r) => r.value != null)
    .map((r) => ({ year: +r.date, value: +r.value }))
    .sort((a, b) => a.year - b.year);
  return rows;
}
async function fromMirror(mirrorUrl) {
  const csv = await fetchText(mirrorUrl);
  const rows = [];
  for (const line of csv.split("\n")) {
    if (!/,CIV,/.test(line)) continue;
    const parts = line.split(",");
    const year = +parts[parts.length - 2];
    const value = +parts[parts.length - 1];
    if (Number.isFinite(year) && Number.isFinite(value)) rows.push({ year, value });
  }
  return rows.sort((a, b) => a.year - b.year);
}

async function run() {
  const features = [];
  for (const ind of INDICATORS) {
    let rows = [];
    try {
      rows = await fromApi(ind.code);
      console.log(`  ${ind.code} via API (${rows.length} années)`);
    } catch (e) {
      rows = await fromMirror(ind.mirror);
      console.log(`  ${ind.code} via miroir GitHub (${rows.length} années)`);
    }
    if (!rows.length) continue;
    const latest = rows[rows.length - 1];
    const series = {};
    rows.slice(-10).forEach((r) => (series[r.year] = r.value));
    features.push(point({
      name: `${ind.name} — Côte d'Ivoire`,
      featureType: "indicateur",
      lng: CI.lng, lat: CI.lat,
      theme: "indicateurs",
      source: "Banque Mondiale",
      admin1: "National",
      verified: true,
      props: {
        indicateur: ind.code,
        annee: latest.year,
        valeur: latest.value,
        unite: ind.unit,
        serie_10ans: JSON.stringify(series),
      },
    }));
  }
  writeCollection("worldbank.geojson", {
    dataset: "Indicateurs Banque Mondiale — Côte d'Ivoire",
    source: "Banque Mondiale",
    theme: "indicateurs",
    license: "CC BY 4.0",
    verified: true,
  }, features);
}
run().catch((e) => { console.error("Échec Banque Mondiale:", e.message); process.exit(1); });
