// Génère la vitrine statique (GitHub Pages) à partir de la base de données.
// Produit docs/data/*.json + fichiers téléchargeables (geojson/csv/json) par jeu.
import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Helpers d'export (dupliqués de src/lib/geo.js pour rester en ESM pur).
function featuresToGeoJSON(features) {
  return {
    type: "FeatureCollection",
    features: features.map((f) => {
      let geometry = null;
      if (f.geometry) { try { geometry = JSON.parse(f.geometry); } catch { geometry = null; } }
      if (!geometry && f.latitude != null && f.longitude != null)
        geometry = { type: "Point", coordinates: [f.longitude, f.latitude] };
      let props = {};
      if (f.properties) { try { props = JSON.parse(f.properties); } catch { props = {}; } }
      return {
        type: "Feature", geometry,
        properties: { id: f.id, nom: f.name, type: f.featureType, district_region: f.admin1 || null,
          departement_commune: f.admin2 || null, verifie: f.verified, ...props },
      };
    }),
  };
}
function featuresToCSV(features) {
  const rows = features.map((f) => {
    let props = {};
    if (f.properties) { try { props = JSON.parse(f.properties); } catch { props = {}; } }
    return { id: f.id, nom: f.name, type: f.featureType, latitude: f.latitude ?? "", longitude: f.longitude ?? "",
      district_region: f.admin1 ?? "", departement_commune: f.admin2 ?? "", verifie: f.verified ? "oui" : "non", ...props };
  });
  if (!rows.length) return "";
  const headers = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set()));
  const esc = (v) => { const s = String(v ?? ""); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const docs = join(root, "docs");
const dataDir = join(docs, "data");
const dlDir = join(dataDir, "downloads");

for (const d of [docs, dataDir, dlDir]) mkdirSync(d, { recursive: true });

async function main() {
  const [themes, sources, datasets, featureCount, verified] = await Promise.all([
    prisma.theme.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.source.findMany({ orderBy: { reliability: "desc" }, include: { _count: { select: { datasets: true } } } }),
    prisma.dataset.findMany({
      include: { theme: true, source: true, _count: { select: { features: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.feature.count(),
    prisma.feature.count({ where: { verified: true } }),
  ]);

  // Aperçu téléchargeable GeoJSON par jeu (borné ; données complètes via l'app)
  const DL_CAP = 1000;
  for (const ds of datasets) {
    const feats = await prisma.feature.findMany({ where: { datasetId: ds.id }, take: DL_CAP });
    const geo = featuresToGeoJSON(feats);
    geo.metadata = { dataset: ds.name, source: ds.source.name, theme: ds.theme.name,
      verified: ds.verified, apercu: ds._count.features > DL_CAP ? `limité à ${DL_CAP} entités` : "complet" };
    writeFileSync(join(dlDir, `${ds.slug}.geojson`), JSON.stringify(geo));
  }

  // Entités pour table + carte. Vu le volume (77k+), on échantillonne par jeu
  // pour l'affichage interactif (les compteurs restent les totaux réels de la base,
  // et les téléchargements + l'app donnent accès à l'intégralité).
  const allFeatures = await prisma.feature.findMany({
    include: { dataset: { select: { slug: true, name: true, theme: { select: { slug: true, name: true, color: true } } } } },
    orderBy: { name: "asc" },
  });
  const raw = allFeatures.map((f) => ({
    id: f.id, name: f.name, featureType: f.featureType,
    latitude: f.latitude, longitude: f.longitude,
    admin1: f.admin1, admin2: f.admin2, verified: f.verified,
    theme: f.dataset.theme, datasetSlug: f.dataset.slug,
    // Géométrie conservée uniquement pour les districts (fond de carte).
    geometry: f.featureType === "district" && f.geometry ? JSON.parse(f.geometry) : null,
    properties: undefined,
  }));
  // Échantillonnage régulier par jeu de données (max PER_DS entités chacun).
  const PER_DS = 120;
  const groups = {};
  for (const f of raw) (groups[f.datasetSlug] ||= []).push(f);
  const features = [];
  for (const slug of Object.keys(groups)) {
    const arr = groups[slug];
    if (arr.length <= PER_DS) { features.push(...arr); continue; }
    const stride = arr.length / PER_DS;
    for (let i = 0; i < PER_DS; i++) features.push(arr[Math.floor(i * stride)]);
  }

  const catalog = {
    generated: new Date().toISOString(),
    stats: { themes: themes.length, sources: sources.length, datasets: datasets.length, features: featureCount, verified },
    themes: themes.map((t) => ({
      slug: t.slug, name: t.name, category: t.category, icon: t.icon, color: t.color, description: t.description,
      datasets: datasets.filter((d) => d.themeId === t.id).map((d) => ({
        slug: d.slug, name: d.name, description: d.description, format: d.format,
        verified: d.verified, source: d.source.name, count: d._count.features,
      })),
    })),
    sources: sources.map((s) => ({
      name: s.name, organization: s.organization, description: s.description,
      license: s.license, reliability: s.reliability, url: s.url, datasets: s._count.datasets,
    })),
  };

  writeFileSync(join(dataDir, "catalog.json"), JSON.stringify(catalog));
  writeFileSync(join(dataDir, "features.json"), JSON.stringify(features));

  // .nojekyll pour servir les dossiers commençant par _ et éviter Jekyll
  writeFileSync(join(docs, ".nojekyll"), "");
  console.log(`✔ Export statique: ${datasets.length} jeux, ${features.length} entités → docs/`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
