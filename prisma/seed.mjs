import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { infrastructure } from "../data/infrastructure.mjs";

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");

// Centroïde approximatif d'une géométrie GeoJSON (moyenne des sommets).
function centroid(geometry) {
  let sx = 0, sy = 0, n = 0;
  const walk = (coords, depth) => {
    if (depth === 0) {
      sx += coords[0];
      sy += coords[1];
      n++;
    } else {
      for (const c of coords) walk(c, depth - 1);
    }
  };
  if (geometry.type === "Polygon") walk(geometry.coordinates, 2);
  else if (geometry.type === "MultiPolygon") walk(geometry.coordinates, 3);
  else if (geometry.type === "Point") return { lng: geometry.coordinates[0], lat: geometry.coordinates[1] };
  if (!n) return { lng: null, lat: null };
  return { lng: sx / n, lat: sy / n };
}

const SOURCES = [
  { key: "INS-CI", name: "Institut National de la Statistique (INS-CI)", organization: "État de Côte d'Ivoire", url: "https://www.ins.ci", license: "Données publiques", reliability: 5, description: "Producteur officiel de la statistique publique ivoirienne." },
  { key: "geoBoundaries", name: "geoBoundaries", organization: "William & Mary geoLab", url: "https://www.geoboundaries.org", license: "CC BY 4.0 / Open", reliability: 4, description: "Limites administratives ouvertes et harmonisées au niveau mondial." },
  { key: "MENA", name: "Ministère de l'Éducation Nationale", organization: "État de Côte d'Ivoire", url: "https://www.education-ci.org", license: "Données publiques", reliability: 5, description: "Cartographie des établissements scolaires et universitaires." },
  { key: "MSHP", name: "Ministère de la Santé et de l'Hygiène Publique", organization: "État de Côte d'Ivoire", url: "https://www.sante.gouv.ci", license: "Données publiques", reliability: 5, description: "Carte sanitaire nationale (CHU, CHR, établissements de santé)." },
  { key: "MJDH", name: "Ministère de la Justice et des Droits de l'Homme", organization: "État de Côte d'Ivoire", url: "https://www.justice.gouv.ci", license: "Données publiques", reliability: 5, description: "Implantation des juridictions et établissements pénitentiaires." },
  { key: "BCEAO", name: "BCEAO", organization: "Banque Centrale des États de l'Afrique de l'Ouest", url: "https://www.bceao.int", license: "Données publiques", reliability: 5, description: "Institutions financières et marché régional (BRVM)." },
  { key: "OSM", name: "OpenStreetMap", organization: "Fondation OpenStreetMap", url: "https://www.openstreetmap.org", license: "ODbL 1.0", reliability: 3, description: "Données géographiques contributives et communautaires." },
];

const THEMES = [
  { slug: "ecoles", name: "Éducation", category: "infrastructure", icon: "🎓", color: "#3b82f6", description: "Écoles, lycées, universités et grandes écoles." },
  { slug: "sante", name: "Santé", category: "infrastructure", icon: "🏥", color: "#ef4444", description: "CHU, CHR, instituts et établissements sanitaires." },
  { slug: "administration", name: "Administration", category: "infrastructure", icon: "🏛️", color: "#a855f7", description: "Institutions, préfectures et mairies." },
  { slug: "securite", name: "Sécurité", category: "infrastructure", icon: "🚔", color: "#0ea5e9", description: "Police, gendarmerie et protection civile." },
  { slug: "defense", name: "Défense & Militaire", category: "infrastructure", icon: "🛡️", color: "#22c55e", description: "État-major, camps, bases aériennes et navales." },
  { slug: "finance", name: "Finance", category: "infrastructure", icon: "🏦", color: "#eab308", description: "Banque centrale, trésor, banques et bourse (BRVM)." },
  { slug: "justice", name: "Justice", category: "infrastructure", icon: "⚖️", color: "#f97316", description: "Cours, tribunaux et établissements pénitentiaires." },
  { slug: "limites-administratives", name: "Limites administratives", category: "limites", icon: "🗺️", color: "#14b8a6", description: "Districts (ADM1) et régions (ADM2) de Côte d'Ivoire." },
  { slug: "pays", name: "Pays", category: "limites", icon: "🇨🇮", color: "#f77f00", description: "Frontière nationale de la Côte d'Ivoire." },
  { slug: "continent", name: "Continent", category: "limites", icon: "🌍", color: "#64748b", description: "Situation continentale (Afrique de l'Ouest)." },
];

function slugify(s) {
  return s.toString().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  console.log("→ Nettoyage…");
  await prisma.download.deleteMany();
  await prisma.feature.deleteMany();
  await prisma.dataset.deleteMany();
  await prisma.theme.deleteMany();
  await prisma.source.deleteMany();

  console.log("→ Sources…");
  const sourceMap = {};
  for (const s of SOURCES) {
    const row = await prisma.source.create({
      data: { name: s.name, organization: s.organization, url: s.url, license: s.license, reliability: s.reliability, description: s.description },
    });
    sourceMap[s.key] = row;
  }

  console.log("→ Thématiques…");
  const themeMap = {};
  for (const t of THEMES) {
    const row = await prisma.theme.create({ data: t });
    themeMap[t.slug] = row;
  }

  // ---- Datasets d'infrastructures (un par thème) ----
  const infraThemes = ["ecoles", "sante", "administration", "securite", "defense", "finance", "justice"];
  const datasetByTheme = {};
  for (const slug of infraThemes) {
    const theme = themeMap[slug];
    const ds = await prisma.dataset.create({
      data: {
        slug: `${slug}-ci`,
        name: `${theme.name} — Côte d'Ivoire`,
        description: `Équipements et implantations du secteur « ${theme.name} » en Côte d'Ivoire.`,
        format: "geojson",
        verified: true,
        verifiedAt: new Date(),
        verifiedNote: "Coordonnées consolidées et recoupées entre sources officielles.",
        themeId: theme.id,
        sourceId: sourceMap["INS-CI"].id,
      },
    });
    datasetByTheme[slug] = ds;
  }

  console.log("→ Infrastructures…");
  let infraCount = 0;
  for (const f of infrastructure) {
    const ds = datasetByTheme[f.theme];
    const src = sourceMap[f.source] || sourceMap["INS-CI"];
    await prisma.feature.create({
      data: {
        name: f.name,
        featureType: f.type,
        latitude: f.lat,
        longitude: f.lng,
        properties: JSON.stringify({ ...(f.props || {}), source: src.name }),
        admin1: f.admin1 || null,
        admin2: f.admin2 || null,
        verified: !!f.verified,
        datasetId: ds.id,
      },
    });
    infraCount++;
  }
  console.log(`   ${infraCount} infrastructures.`);

  // ---- Limites : Pays (ADM0) ----
  console.log("→ Limites (pays, districts, régions)…");
  const country = JSON.parse(readFileSync(join(dataDir, "civ_country.geojson"), "utf8"));
  const dsPays = await prisma.dataset.create({
    data: {
      slug: "frontiere-nationale-ci",
      name: "Frontière nationale — Côte d'Ivoire",
      description: "Contour national de la Côte d'Ivoire (ADM0).",
      format: "geojson", verified: true, verifiedAt: new Date(),
      verifiedNote: "Source ouverte geoBoundaries, contrôlée.",
      themeId: themeMap["pays"].id, sourceId: sourceMap["geoBoundaries"].id,
    },
  });
  for (const feat of country.features) {
    const c = centroid(feat.geometry);
    await prisma.feature.create({
      data: {
        name: "Côte d'Ivoire",
        featureType: "pays",
        latitude: c.lat, longitude: c.lng,
        geometry: JSON.stringify(feat.geometry),
        properties: JSON.stringify({ iso: "CIV", niveau: "ADM0" }),
        admin1: null, verified: true, datasetId: dsPays.id,
      },
    });
  }

  // ---- Limites : Districts (ADM1) ----
  const adm1 = JSON.parse(readFileSync(join(dataDir, "civ_ADM1.geojson"), "utf8"));
  const dsAdm1 = await prisma.dataset.create({
    data: {
      slug: "districts-adm1-ci",
      name: "Districts (ADM1) — Côte d'Ivoire",
      description: "14 districts (dont Abidjan et Yamoussoukro autonomes).",
      format: "geojson", verified: true, verifiedAt: new Date(),
      verifiedNote: "geoBoundaries gbOpen, géométries simplifiées.",
      themeId: themeMap["limites-administratives"].id, sourceId: sourceMap["geoBoundaries"].id,
    },
  });
  for (const feat of adm1.features) {
    const c = centroid(feat.geometry);
    await prisma.feature.create({
      data: {
        name: feat.properties.shapeName || "District",
        featureType: "district",
        latitude: c.lat, longitude: c.lng,
        geometry: JSON.stringify(feat.geometry),
        properties: JSON.stringify({ niveau: "ADM1", shapeID: feat.properties.shapeID }),
        admin1: feat.properties.shapeName || null,
        verified: true, datasetId: dsAdm1.id,
      },
    });
  }

  // ---- Limites : Régions (ADM2) ----
  const adm2 = JSON.parse(readFileSync(join(dataDir, "civ_ADM2.geojson"), "utf8"));
  const dsAdm2 = await prisma.dataset.create({
    data: {
      slug: "regions-adm2-ci",
      name: "Régions (ADM2) — Côte d'Ivoire",
      description: "33 régions de Côte d'Ivoire.",
      format: "geojson", verified: true, verifiedAt: new Date(),
      verifiedNote: "geoBoundaries gbOpen, géométries simplifiées.",
      themeId: themeMap["limites-administratives"].id, sourceId: sourceMap["geoBoundaries"].id,
    },
  });
  for (const feat of adm2.features) {
    const c = centroid(feat.geometry);
    await prisma.feature.create({
      data: {
        name: feat.properties.shapeName || "Région",
        featureType: "region",
        latitude: c.lat, longitude: c.lng,
        geometry: JSON.stringify(feat.geometry),
        properties: JSON.stringify({ niveau: "ADM2", shapeID: feat.properties.shapeID }),
        admin1: feat.properties.shapeName || null,
        verified: true, datasetId: dsAdm2.id,
      },
    });
  }

  // ---- Continent (référence) ----
  const dsCont = await prisma.dataset.create({
    data: {
      slug: "afrique-reference",
      name: "Afrique — situation de la Côte d'Ivoire",
      description: "Repère continental : Afrique de l'Ouest.",
      format: "geojson", verified: true, verifiedAt: new Date(),
      themeId: themeMap["continent"].id, sourceId: sourceMap["geoBoundaries"].id,
    },
  });
  await prisma.feature.create({
    data: {
      name: "Afrique", featureType: "continent",
      latitude: 6.5, longitude: 8.0,
      properties: JSON.stringify({ region: "Afrique de l'Ouest", zone_economique: "CEDEAO / UEMOA" }),
      verified: true, datasetId: dsCont.id,
    },
  });

  const totals = {
    sources: await prisma.source.count(),
    themes: await prisma.theme.count(),
    datasets: await prisma.dataset.count(),
    features: await prisma.feature.count(),
  };
  console.log("✔ Seed terminé:", totals);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
