import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, createSession, setSessionCookie } from "@/lib/auth";
import { seedDatabase } from "@/lib/seed";

export async function POST(request: Request) {
  try {
    await seedDatabase();
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    const { rows } = await query(
      "SELECT id, email, first_name, last_name, password_hash FROM users WHERE email = $1",
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    const user = rows[0];

    // Reject login for legacy seed users that have no password set
    if (!user.password_hash) {
      return NextResponse.json({ error: "Veuillez réinitialiser votre mot de passe" }, { status: 401 });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    const token = createSession(user.id);
    setSessionCookie(token);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Erreur lors de la connexion" }, { status: 500 });
  }
}
