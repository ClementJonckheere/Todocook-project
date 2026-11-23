"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

interface Food {
  id: number;
  name: string;
  brand: string | null;
  excluded: boolean;
}

function label(food: Food) {
  return food.brand ? `${food.name} (${food.brand})` : food.name;
}

export function DinnerExclusions({ onChange }: { onChange: () => void }) {
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const response = await fetch(apiUrl("/api/users/dinner-exclusions"), { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) {
          setFoods(data);
          setError("");
        }
      } catch {
        if (!controller.signal.aborted) setError("Impossible de charger vos préférences.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [retry]);

  async function update(id: number, excluded: boolean) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/api/users/dinner-exclusions"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, excluded }),
      });
      if (!response.ok) throw new Error();
      setFoods(previous => previous.map(food => food.id === id ? { ...food, excluded } : food));
      onChange();
    } catch {
      setError("Impossible d’enregistrer cette préférence.");
    } finally {
      setBusy(false);
    }
  }

  const excluded = foods.filter(food => food.excluded);
  return (
    <details className="my-3 rounded-lg border border-gray-200 p-3">
      <summary className="cursor-pointer text-sm font-medium">Ingrédients à éviter{excluded.length > 0 && ` (${excluded.length})`}</summary>
      <label className="mt-2 block text-xs text-gray-600">Masquer les dîners qui contiennent cet ingrédient
        <select value="" disabled={busy || loading} onChange={event => update(Number(event.target.value), true)}
          className="mt-1 block w-full rounded-lg border p-2 text-sm">
          <option value="" disabled>{loading ? "Chargement…" : "Choisir un ingrédient"}</option>
          {foods.filter(food => !food.excluded).map(food => <option key={food.id} value={food.id}>{label(food)}</option>)}
        </select>
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {excluded.map(food => <button key={food.id} disabled={busy || loading} onClick={() => update(food.id, false)}
          aria-label={`Autoriser de nouveau ${label(food)}`} className="rounded-lg bg-gray-100 px-3 py-2 text-sm">{label(food)} ×</button>)}
      </div>
      {error && <p role="alert" className="mt-2 text-sm">{error} <button className="underline" onClick={() => setRetry(value => value + 1)}>Recharger</button></p>}
    </details>
  );
}
