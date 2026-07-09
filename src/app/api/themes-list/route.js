import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export async function GET() {
  const themes = await prisma.theme.findMany({
    select: { slug: true, name: true, icon: true, category: true, color: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(themes);
}
