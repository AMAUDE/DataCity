import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

// Détecte des colonnes latitude/longitude sous divers intitulés (multi-formats).
const LAT_KEYS = ["latitude", "lat", "y", "ycoord", "gps_lat"];
const LNG_KEYS = ["longitude", "lon", "lng", "long", "x", "xcoord", "gps_lng", "gps_lon"];
const NAME_KEYS = ["name", "nom", "libelle", "designation", "title", "titre", "shapename"];
const TYPE_KEYS = ["type", "categorie", "category", "featuretype", "classe"];
const ADMIN1_KEYS = ["admin1", "district", "region", "shapename", "province"];

function pick(obj, keys) {
  for (const k of Object.keys(obj)) {
    if (keys.includes(k.toLowerCase().trim())) return obj[k];
  }
  return null;
}

function toNum(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Parse CSV simple avec séparateur , ou ;
function parseCSV(text) {
  const rows = [];
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length);
  if (!lines.length) return rows;
  const delim = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : ",";
  const split = (line) => {
    const out = [];
    let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else {
        if (c === '"') q = true;
        else if (c === delim) { out.push(cur); cur = ""; }
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = split(lines[0]).map((h) => h.trim());
  for (let i = 1; i < lines.length; i++) {
    const cells = split(lines[i]);
    const obj = {};
    headers.forEach((h, j) => (obj[h] = (cells[j] ?? "").trim()));
    rows.push(obj);
  }
  return rows;
}

// Normalise un enregistrement quelconque en Feature interne.
function normalize(rec, geometry) {
  const name = (pick(rec, NAME_KEYS) || "Sans nom").toString().trim();
  const type = (pick(rec, TYPE_KEYS) || "autre").toString().trim();
  const admin1 = pick(rec, ADMIN1_KEYS);
  let lat = toNum(pick(rec, LAT_KEYS));
  let lng = toNum(pick(rec, LNG_KEYS));
  if ((lat == null || lng == null) && geometry?.type === "Point") {
    lng = geometry.coordinates[0];
    lat = geometry.coordinates[1];
  }
  const used = new Set([...LAT_KEYS, ...LNG_KEYS, ...NAME_KEYS, ...TYPE_KEYS, ...ADMIN1_KEYS]);
  const props = {};
  for (const [k, v] of Object.entries(rec)) {
    if (!used.has(k.toLowerCase().trim()) && v !== "" && v != null) props[k] = v;
  }
  return {
    name,
    featureType: type,
    latitude: lat,
    longitude: lng,
    admin1: admin1 ? admin1.toString().trim() : null,
    geometry: geometry && geometry.type !== "Point" ? JSON.stringify(geometry) : null,
    properties: Object.keys(props).length ? JSON.stringify(props) : null,
  };
}

export async function POST(req) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { datasetName, themeSlug, sourceName, content, format, verified } = body;
    if (!datasetName || !themeSlug || !sourceName || !content) {
      return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
    }

    const theme = await prisma.theme.findUnique({ where: { slug: themeSlug } });
    if (!theme) return NextResponse.json({ error: "Thématique inconnue." }, { status: 400 });

    const source = await prisma.source.upsert({
      where: { name: sourceName },
      update: {},
      create: { name: sourceName, reliability: 3, description: "Source importée via la plateforme." },
    });

    // Construction des enregistrements normalisés
    let records = [];
    let fmt = (format || "").toLowerCase();
    if (!fmt) {
      const t = content.trim();
      fmt = t.startsWith("{") || t.startsWith("[") ? "geojson" : "csv";
    }

    if (fmt === "csv") {
      records = parseCSV(content).map((r) => normalize(r, null));
    } else {
      const parsed = typeof content === "string" ? JSON.parse(content) : content;
      if (parsed.type === "FeatureCollection" && Array.isArray(parsed.features)) {
        records = parsed.features.map((f) => normalize(f.properties || {}, f.geometry));
      } else if (Array.isArray(parsed)) {
        records = parsed.map((r) => normalize(r, r.geometry || null));
      } else {
        return NextResponse.json({ error: "Format JSON non reconnu." }, { status: 400 });
      }
    }

    // Correction / nettoyage : suppression des doublons (nom+coord), rejet des vides
    const seen = new Set();
    const cleaned = [];
    let rejected = 0;
    for (const r of records) {
      if (!r.name || r.name === "Sans nom") { rejected++; continue; }
      const key = `${r.name}|${r.latitude}|${r.longitude}`;
      if (seen.has(key)) { rejected++; continue; }
      seen.add(key);
      cleaned.push(r);
    }

    // Jointure : rattacher admin1 à un district/région connu si correspondance
    const boundaries = await prisma.feature.findMany({
      where: { featureType: { in: ["district", "region"] } },
      select: { name: true },
    });
    const known = new Set(boundaries.map((b) => b.name.toLowerCase()));
    let joined = 0;
    for (const r of cleaned) {
      if (r.admin1 && known.has(r.admin1.toLowerCase())) joined++;
    }

    const baseSlug = datasetName.toString().toLowerCase().normalize("NFD")
      .replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const dataset = await prisma.dataset.create({
      data: {
        slug,
        name: datasetName,
        description: `Import « ${datasetName} » depuis ${sourceName}.`,
        format: fmt === "csv" ? "csv" : "geojson",
        verified: !!verified,
        verifiedAt: verified ? new Date() : null,
        verifiedNote: verified ? "Vérifié à l'import par un administrateur." : null,
        themeId: theme.id,
        sourceId: source.id,
        features: {
          create: cleaned.map((r) => ({
            name: r.name,
            featureType: r.featureType,
            latitude: r.latitude,
            longitude: r.longitude,
            geometry: r.geometry,
            properties: r.properties,
            admin1: r.admin1,
            verified: !!verified,
          })),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      datasetSlug: dataset.slug,
      imported: cleaned.length,
      rejected,
      joined,
      total: records.length,
    });
  } catch (e) {
    return NextResponse.json({ error: "Import échoué : " + (e.message || "erreur") }, { status: 500 });
  }
}
