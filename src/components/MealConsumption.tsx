"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/api";

export function MealConsumption({ id, portions, planned, onChange }: {
  id: number;
  portions: number;
  planned: number;
  onChange: () => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(portions || planned));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (value: number) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/api/meal-plans"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, portions: value }),
      });
      if (!response.ok) throw new Error();
      await onChange();
    } catch {
      setError("Le journal n’a pas pu être mis à jour. Réessaie.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 space-y-1 text-sm">
      <p>{portions > 0 ? `Consommé · ${portions.toLocaleString("fr-FR")} portion(s)` : "Prévu"}</p>
      <div className="flex flex-wrap items-center gap-2">
        <label>Portions <input aria-label="Portions consommées" className="w-16 rounded border p-1" type="number" min="0.01" max="100" step="any" value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <button disabled={busy || !(Number(amount) > 0 && Number(amount) <= 100)} onClick={() => save(Number(amount))} className="rounded bg-primary-600 px-3 py-2 text-white disabled:opacity-50">
          {portions ? "Ajuster" : "J’ai mangé"}
        </button>
        {portions > 0 && <button disabled={busy} onClick={() => save(0)} className="underline">Annuler la consommation</button>}
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
