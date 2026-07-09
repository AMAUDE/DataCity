import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(req) {
  try {
    const { email, name, password } = await req.json();
    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Email et mot de passe (min. 6 caractères) requis." },
        { status: 400 }
      );
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email." },
        { status: 409 }
      );
    }
    const hash = await bcrypt.hash(password, 10);
    const count = await prisma.user.count();
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        password: hash,
        role: count === 0 ? "admin" : "user",
      },
    });
    await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });
    return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (e) {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
