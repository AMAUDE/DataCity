import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const theme = searchParams.get("theme");
  const where = {};
  if (theme) where.theme = { slug: theme };
  const datasets = await prisma.dataset.findMany({
    where,
    include: {
      theme: true,
      source: true,
      _count: { select: { features: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(datasets);
}
