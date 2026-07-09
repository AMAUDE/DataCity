import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
    }
    await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });
    return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (e) {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
