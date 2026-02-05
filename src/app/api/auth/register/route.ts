import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth";
import { validateRequired, validateEmail, validatePassword } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, first_name, last_name } = body;

    const errors = [
      ...validateRequired({ email, password, first_name, last_name }, ["email", "password", "first_name", "last_name"]),
      ...validatePassword(password),
    ];

    if (email && !validateEmail(email)) {
      errors.push({ field: "email", message: "Email invalide" });
    }

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // Check if email already exists
    const { rows: existing } = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.length > 0) {
      return NextResponse.json({ errors: [{ field: "email", message: "Cet email est déjà utilisé" }] }, { status: 409 });
    }

    const password_hash = hashPassword(password);
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name`,
      [email, password_hash, first_name, last_name]
    );

    const user = rows[0];
    const token = createSession(user.id);
    setSessionCookie(token);

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 });
  }
}
