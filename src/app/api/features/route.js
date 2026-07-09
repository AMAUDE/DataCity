import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { featuresToGeoJSON } from "@/lib/geo";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const theme = searchParams.get("theme");
  const dataset = searchParams.get("dataset");
  const type = searchParams.get("type");
  const admin1 = searchParams.get("admin1");
  const q = searchParams.get("q");
  const format = searchParams.get("format"); // geojson | list
  const withGeometry = searchParams.get("geometry") === "1";
  const limit = Math.min(parseInt(searchParams.get("limit") || "5000", 10), 20000);

  const where = {};
  if (dataset) where.dataset = { slug: dataset };
  else if (theme) where.dataset = { theme: { slug: theme } };
  if (type) where.featureType = type;
  if (admin1) where.admin1 = admin1;
  if (q) where.name = { contains: q };

  const features = await prisma.feature.findMany({
    where,
    take: limit,
    orderBy: { name: "asc" },
    include: { dataset: { select: { slug: true, name: true, theme: { select: { slug: true, name: true, color: true } } } } },
  });

  if (format === "geojson") {
    return NextResponse.json(featuresToGeoJSON(features));
  }

  const list = features.map((f) => ({
    id: f.id,
    name: f.name,
    featureType: f.featureType,
    latitude: f.latitude,
    longitude: f.longitude,
    admin1: f.admin1,
    admin2: f.admin2,
    verified: f.verified,
    theme: f.dataset.theme,
    datasetSlug: f.dataset.slug,
    datasetName: f.dataset.name,
    hasGeometry: !!f.geometry,
    geometry: withGeometry && f.geometry ? JSON.parse(f.geometry) : undefined,
    properties: f.properties ? JSON.parse(f.properties) : {},
  }));
  return NextResponse.json(list);
}
