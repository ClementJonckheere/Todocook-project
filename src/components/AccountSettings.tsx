"use client";

import { FormEvent, useState } from "react";
import { KeyRound, Mail, ShieldAlert } from "lucide-react";
import { apiUrl } from "@/lib/api";

const field = "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800";
const card = "rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800";

type Status = { kind: "ok" | "error"; text: string } | null;

async function send(path: string, method: string, body: unknown): Promise<{ ok: boolean; data: { error?: string; message?: string } }> {
  const res = await fetch(apiUrl(path), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p role={status.kind === "error" ? "alert" : "status"}
      className={`mt-2 text-sm ${status.kind === "error" ? "text-red-600" : "text-primary-700 dark:text-primary-300"}`}>
      {status.text}
    </p>
  );
}

/** Section « Compte » du profil : e-mail, mot de passe et suppression du compte. */
export function AccountSettings({ email, onEmailChanged }: { email: string; onEmailChanged: (email: string) => void }) {
  const [open, setOpen] = useState<"email" | "password" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const toggle = (section: typeof open) => {
    setOpen(open === section ? null : section);
    setStatus(null);
  };

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { ok, data } = await send("/api/account/email", "PUT", { email: newEmail, password: emailPassword });
    setBusy(false);
    if (!ok) return setStatus({ kind: "error", text: data.error || "Modification impossible." });
    onEmailChanged((data as { email?: string }).email ?? newEmail);
    setNewEmail(""); setEmailPassword("");
    setStatus({ kind: "ok", text: "Adresse e-mail modifiée : utilisez-la désormais pour vous connecter." });
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) return setStatus({ kind: "error", text: "Les deux mots de passe ne correspondent pas." });
    setBusy(true);
    const { ok, data } = await send("/api/account/password", "PUT", { current_password: currentPassword, new_password: newPassword });
    setBusy(false);
    if (!ok) return setStatus({ kind: "error", text: data.error || "Modification impossible." });
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    setStatus({ kind: "ok", text: data.message || "Mot de passe modifié." });
  };

  const submitDelete = async (event: FormEvent) => {
    event.preventDefault();
    if (!window.confirm("Supprimer définitivement votre compte et toutes vos données ? Cette action est irréversible.")) return;
    setBusy(true);
    const { ok, data } = await send("/api/account", "DELETE", { password: deletePassword, confirmation });
    setBusy(false);
    if (!ok) return setStatus({ kind: "error", text: data.error || "Suppression impossible." });
    window.location.replace("/login");
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Compte</h2>

      <div className={card}>
        <button type="button" onClick={() => toggle("email")} className="flex w-full items-center gap-2 text-left text-sm font-medium">
          <Mail size={16} /> Adresse e-mail <span className="ml-auto truncate text-gray-500">{email}</span>
        </button>
        {open === "email" && (
          <form onSubmit={submitEmail} className="mt-3 space-y-2">
            <label className="block text-xs text-gray-600 dark:text-gray-300">Nouvelle adresse
              <input type="email" required autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={field} />
            </label>
            <label className="block text-xs text-gray-600 dark:text-gray-300">Mot de passe actuel
              <input type="password" required autoComplete="current-password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} className={field} />
            </label>
            <button disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Modifier l&apos;adresse</button>
            <StatusLine status={status} />
          </form>
        )}
      </div>

      <div className={card}>
        <button type="button" onClick={() => toggle("password")} className="flex w-full items-center gap-2 text-left text-sm font-medium">
          <KeyRound size={16} /> Mot de passe
        </button>
        {open === "password" && (
          <form onSubmit={submitPassword} className="mt-3 space-y-2">
            <label className="block text-xs text-gray-600 dark:text-gray-300">Mot de passe actuel
              <input type="password" required autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={field} />
            </label>
            <label className="block text-xs text-gray-600 dark:text-gray-300">Nouveau mot de passe (8 caractères minimum)
              <input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={field} />
            </label>
            <label className="block text-xs text-gray-600 dark:text-gray-300">Confirmer le nouveau mot de passe
              <input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={field} />
            </label>
            <p className="text-xs text-gray-500">Vos autres appareils seront déconnectés.</p>
            <button disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Changer le mot de passe</button>
            <StatusLine status={status} />
          </form>
        )}
      </div>

      <div className={`${card} border-red-200 dark:border-red-900`}>
        <button type="button" onClick={() => toggle("delete")} className="flex w-full items-center gap-2 text-left text-sm font-medium text-red-600">
          <ShieldAlert size={16} /> Supprimer mon compte
        </button>
        {open === "delete" && (
          <form onSubmit={submitDelete} className="mt-3 space-y-2">
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Votre compte et toutes vos données seront définitivement supprimés : profil, garde-manger, planning,
              journal, listes de courses, recettes privées. Une recette publique utilisée par d&apos;autres personnes
              est conservée, sans lien avec vous. Pensez à exporter vos données avant.
            </p>
            <label className="block text-xs text-gray-600 dark:text-gray-300">Mot de passe
              <input type="password" required autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className={field} />
            </label>
            <label className="block text-xs text-gray-600 dark:text-gray-300">Tapez SUPPRIMER pour confirmer
              <input required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={field} autoComplete="off" />
            </label>
            <button disabled={busy || confirmation !== "SUPPRIMER"} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              Supprimer définitivement
            </button>
            <StatusLine status={status} />
          </form>
        )}
      </div>
    </div>
  );
}
