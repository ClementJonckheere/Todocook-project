"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { apiUrl } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Envoi impossible. Réessayez plus tard.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Mot de passe oublié">
      {message ? (
        <p role="status" className="text-sm text-gray-700">{message}</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-gray-600">Indiquez l&apos;adresse de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
          <label className="block text-xs font-medium text-gray-500">Email
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1" placeholder="votre@email.fr" />
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button disabled={busy} className="w-full bg-primary-500 text-white py-3 rounded-xl font-medium disabled:opacity-50">
            {busy ? "Envoi…" : "Recevoir le lien"}
          </button>
        </form>
      )}
      <Link href="/login" className="mt-4 block text-center text-sm text-primary-700">← Retour à la connexion</Link>
    </AuthCard>
  );
}
