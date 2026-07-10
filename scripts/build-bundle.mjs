// Construit le bundle de données (autonome) pour l'application vitrine :
// catalogue + statistiques, niveaux administratifs, échantillon d'entités,
// et répartition par sous-type au sein de chaque thématique.
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const prisma = new PrismaClient();
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "scratchpadless.json");

function centroid(geom) {
  let sx = 0, sy = 0, n = 0;
  const walk = (c, d) => { if (d === 0) { sx += c[0]; sy += c[1]; n++; } else for (const x of c) walk(x, d - 1); };
  if (geom.type === "Polygon") walk(geom.coordinates, 2); else if (geom.type === "MultiPolygon") walk(geom.coordinates, 3);
  return n ? { lat: sy / n, lng: sx / n } : { lat: null, lng: null };
}
function simp(r) { const o = []; let l = null; for (const c of r) { const p = [Math.round(c[0]*100)/100, Math.round(c[1]*100)/100]; if (!l || l[0]!==p[0] || l[1]!==p[1]) { o.push(p); l = p; } } return o; }
function rings(g) { if (!g) return []; g = JSON.parse(g); if (g.type==="Polygon") return g.coordinates.map(simp); if (g.type==="MultiPolygon") return g.coordinates.flat().map(simp); return []; }

async function main() {
  const [themes, sources, datasets, featureCount, verified] = await Promise.all([
    prisma.theme.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.source.findMany({ orderBy: { reliability: "desc" }, include: { _count: { select: { datasets: true } } } }),
    prisma.dataset.findMany({ include: { theme: true, source: true, _count: { select: { features: true } } } }),
    prisma.feature.count(),
    prisma.feature.count({ where: { verified: true } }),
  ]);

  const catalog = {
    stats: { themes: themes.length, sources: sources.length, datasets: datasets.length, features: featureCount, verified },
    themes: themes.map((t) => ({
      slug: t.slug, name: t.name, category: t.category, icon: t.icon, color: t.color, description: t.description,
      datasets: datasets.filter((d) => d.themeId === t.id).map((d) => ({ slug: d.slug, name: d.name, source: d.source.name, count: d._count.features })),
    })),
    sources: sources.map((s) => ({ name: s.name, organization: s.organization, description: s.description, license: s.license, reliability: s.reliability, url: s.url, datasets: s._count.datasets })),
  };

  // Niveaux administratifs (recherche + zoom)
  const [dRows, rRows, sRows] = await Promise.all([
    prisma.feature.findMany({ where: { featureType: "district" }, select: { name: true, latitude: true, longitude: true, geometry: true } }),
    prisma.feature.findMany({ where: { featureType: "region" }, select: { name: true, latitude: true, longitude: true } }),
    prisma.feature.findMany({ where: { featureType: "sous_prefecture" }, select: { name: true, latitude: true, longitude: true } }),
  ]);
  const admin = {
    districts: dRows.map((d) => ({ name: d.name, lat: d.latitude, lng: d.longitude, rings: rings(d.geometry) })),
    regions: rRows.filter((r) => r.latitude != null).map((r) => ({ name: r.name, lat: r.latitude, lng: r.longitude })),
    souspref: sRows.filter((s) => s.latitude != null).map((s) => ({ name: s.name, lat: s.latitude, lng: s.longitude })),
  };

  // Un seul passage sur toutes les entités : échantillon carte + sous-types
  const all = await prisma.feature.findMany({
    select: { name: true, featureType: true, latitude: true, longitude: true, admin1: true, verified: true,
      dataset: { select: { slug: true, source: { select: { name: true } }, theme: { select: { slug: true, name: true, color: true } } } } },
  });

  // Répartition par sous-type au sein de chaque thématique
  const themeTypes = {};
  for (const f of all) {
    const ts = f.dataset.theme.slug, ft = f.featureType || "autre";
    (themeTypes[ts] ||= {});
    themeTypes[ts][ft] = (themeTypes[ts][ft] || 0) + 1;
  }
  for (const k of Object.keys(themeTypes)) {
    themeTypes[k] = Object.entries(themeTypes[k]).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }

  // Échantillon d'entités par jeu (max PER_DS) pour carte + listes
  const PER_DS = 120, EXCL = new Set(["region", "district", "pays", "continent"]);
  const byDs = {};
  for (const f of all) (byDs[f.dataset.slug] ||= []).push(f);
  const points = [];
  for (const slug of Object.keys(byDs)) {
    const arr = byDs[slug];
    const pick = (f) => ({ name: f.name, type: f.featureType,
      lat: f.latitude == null ? null : Math.round(f.latitude * 10000) / 10000,
      lng: f.longitude == null ? null : Math.round(f.longitude * 10000) / 10000,
      admin1: f.admin1, verified: f.verified, source: f.dataset.source.name,
      theme: f.dataset.theme });
    if (arr.length <= PER_DS) arr.forEach((f) => points.push(pick(f)));
    else { const stride = arr.length / PER_DS; for (let i = 0; i < PER_DS; i++) points.push(pick(arr[Math.floor(i * stride)])); }
  }

  const bundle = { catalog, admin, points, themeTypes };
  writeFileSync(process.env.BUNDLE_OUT, JSON.stringify(bundle));
  const kb = (JSON.stringify(bundle).length / 1024).toFixed(0);
  console.log(`✔ bundle : ${points.length} entités (échantillon), ${admin.souspref.length} sous-préf., ${Object.keys(themeTypes).length} thèmes typés — ${kb} KB`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
