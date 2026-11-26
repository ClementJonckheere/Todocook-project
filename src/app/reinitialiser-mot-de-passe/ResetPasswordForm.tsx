"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <p role="alert" className="text-sm text-red-600">
        Lien incomplet. <Link href="/mot-de-passe-oublie" className="underline">Faites une nouvelle demande</Link>.
      </p>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) return setError("Les deux mots de passe ne correspondent pas.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Réinitialisation impossible.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-3">
        <p role="status" className="text-sm text-gray-700">Mot de passe modifié. Tous vos appareils ont été déconnectés.</p>
        <Link href="/login" className="block w-full rounded-xl bg-primary-500 py-3 text-center font-medium text-white">Se connecter</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-xs font-medium text-gray-500">Nouveau mot de passe (8 caractères minimum)
        <input type="password" required minLength={8} autoComplete="new-password" value={password}
          onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1" />
      </label>
      <label className="block text-xs font-medium text-gray-500">Confirmer le mot de passe
        <input type="password" required minLength={8} autoComplete="new-password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm mt-1" />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error} {error.includes("expiré") && <Link href="/mot-de-passe-oublie" className="underline">Nouvelle demande</Link>}
        </p>
      )}
      <button disabled={busy} className="w-full bg-primary-500 text-white py-3 rounded-xl font-medium disabled:opacity-50">
        {busy ? "Enregistrement…" : "Enregistrer le mot de passe"}
      </button>
    </form>
  );
}
