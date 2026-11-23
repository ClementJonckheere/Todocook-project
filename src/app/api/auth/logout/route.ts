import { NextResponse } from "next/server";
import { clearSessionCookie, revokeCurrentSession } from "@/lib/auth";

export async function POST() {
  try {
    await revokeCurrentSession();
    clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Erreur lors de la déconnexion" }, { status: 500 });
  }
}
