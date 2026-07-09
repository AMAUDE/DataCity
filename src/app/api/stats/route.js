import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [themes, sources, datasets, features, verified] = await Promise.all([
    prisma.theme.count(),
    prisma.source.count(),
    prisma.dataset.count(),
    prisma.feature.count(),
    prisma.feature.count({ where: { verified: true } }),
  ]);
  return NextResponse.json({ themes, sources, datasets, features, verified });
}
