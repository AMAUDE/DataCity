import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { featuresToGeoJSON, featuresToCSV } from "@/lib/geo";

// Téléchargement réservé aux utilisateurs identifiés (traçabilité).
export async function GET(req) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Authentification requise pour télécharger les données." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("dataset");
  const format = (searchParams.get("format") || "geojson").toLowerCase();
  if (!slug) return NextResponse.json({ error: "Paramètre 'dataset' requis." }, { status: 400 });

  const dataset = await prisma.dataset.findUnique({
    where: { slug },
    include: { features: true, source: true, theme: true },
  });
  if (!dataset) return NextResponse.json({ error: "Jeu de données introuvable." }, { status: 404 });

  await prisma.download.create({
    data: { userId: session.id, datasetId: dataset.id, format },
  });

  const base = `${dataset.slug}`;
  if (format === "csv") {
    const csv = featuresToCSV(dataset.features);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.csv"`,
      },
    });
  }
  if (format === "json") {
    const payload = {
      dataset: { name: dataset.name, description: dataset.description, verified: dataset.verified },
      source: { name: dataset.source.name, license: dataset.source.license, url: dataset.source.url },
      theme: dataset.theme.name,
      features: dataset.features.map((f) => ({
        name: f.name, type: f.featureType, latitude: f.latitude, longitude: f.longitude,
        admin1: f.admin1, admin2: f.admin2, verified: f.verified,
        properties: f.properties ? JSON.parse(f.properties) : {},
      })),
    };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.json"`,
      },
    });
  }
  // GeoJSON par défaut
  const geo = featuresToGeoJSON(dataset.features);
  geo.metadata = {
    dataset: dataset.name,
    source: dataset.source.name,
    license: dataset.source.license,
    theme: dataset.theme.name,
    verified: dataset.verified,
    generated: new Date().toISOString(),
  };
  return new NextResponse(JSON.stringify(geo), {
    headers: {
      "Content-Type": "application/geo+json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}.geojson"`,
    },
  });
}
