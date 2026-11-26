"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { apiUrl } from "@/lib/api";
import { MEAL_LABELS, validFoodAmount, type MealType } from "@/lib/food-journal";
import { hasNutrition } from "@/lib/open-food-facts";

interface Food {
  id: number;
  name: string;
  brand: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

interface Entry {
  id: number;
  name: string;
  brand: string | null;
  grams: number;
  meal_type: MealType;
  calories_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
}

function label(food: Pick<Food, "name" | "brand">) {
  return food.brand ? `${food.name} · ${food.brand}` : food.name;
}

const fieldClass = "mt-1 w-full rounded-lg border bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800";

export function FoodJournal({ initialFood, initialDate }: { initialFood: Food | null; initialDate: string | null }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [day, setDay] = useState(initialDate && initialDate <= today ? initialDate : today);
  return (
    <section className="space-y-4 px-4 pb-24 pt-8 text-gray-900 dark:text-white">
      <Link href="/dashboard" className="text-sm text-primary-700 dark:text-primary-300">← Accueil</Link>
      <h1 className="text-2xl font-bold">Aliments consommés</h1>
      <label className="block text-sm">Jour du journal
        <input type="date" max={today} value={day} onChange={e => {
          if (e.target.value && e.target.value <= today) setDay(e.target.value);
        }} className={fieldClass} />
      </label>
      <DayEntries key={day} day={day} initialFood={initialFood} />
    </section>
  );
}

function DayEntries({ day, initialFood }: { day: string; initialFood: Food | null }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [revision, refresh] = useState(0);
  const [listError, setListError] = useState(false);
  const [food, setFood] = useState<Food | null>(initialFood);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<Food[]>([]);
  const [searchStatus, setSearchStatus] = useState("");
  const [editing, setEditing] = useState<Entry | null>(null);
  const [amount, setAmount] = useState("100");
  const [meal, setMeal] = useState<MealType>("collation");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const entryKey = useRef("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const abort = new AbortController();
    async function load() {
      setListError(false);
      try {
        const response = await fetch(apiUrl(`/api/food-journal?date=${day}`), { signal: abort.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!abort.signal.aborted) { setEntries(data); setLoaded(true); }
      } catch {
        if (!abort.signal.aborted) setListError(true);
      }
    }
    load();
    return () => abort.abort();
  }, [day, revision]);

  useEffect(() => {
    const term = search.trim();
    setMatches([]);
    setSearchStatus("");
    if (term.length < 2 || food || editing) return;
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(apiUrl(`/api/ingredients?search=${encodeURIComponent(term)}`), { signal: abort.signal });
        if (!response.ok) throw new Error();
        const data: Food[] = await response.json();
        if (!abort.signal.aborted) {
          setMatches(data);
          if (!data.length) setSearchStatus("Aucun aliment trouvé. Vous pouvez aussi scanner son code-barres.");
        }
      } catch {
        if (!abort.signal.aborted) setSearchStatus("Recherche indisponible. Réessayez.");
      }
    }, 200);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [search, food, editing]);

  function clearForm() {
    setEditing(null); setFood(null); setSearch(""); setAmount("100"); setMeal("collation");
    entryKey.current = "";
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || !validFoodAmount(Number(amount)) || (!food && !editing)) return;
    setBusy(true); setMessage("");
    try {
      if (!editing && !entryKey.current) entryKey.current = crypto.randomUUID();
      const data = editing ? { id: editing.id } : { ingredient_id: food!.id, entry_key: entryKey.current, date: day };
      const r = await fetch(apiUrl("/api/food-journal"), {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, grams: Number(amount), meal_type: meal }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error);
      setMessage(editing ? "Quantité et repas mis à jour." : "Aliment enregistré.");
      clearForm(); refresh(n => n + 1);
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : "Enregistrement impossible. Vérifiez la saisie et réessayez.");
    }
    finally { setBusy(false); }
  }

  async function remove(entry: Entry) {
    if (!window.confirm(`Supprimer « ${label(entry)} » du journal ?`)) return;
    setBusy(true); setMessage("");
    try {
      const r = await fetch(apiUrl(`/api/food-journal?id=${entry.id}`), { method: "DELETE" });
      if (!r.ok) throw new Error();
      if (editing?.id === entry.id) clearForm();
      setMessage("Aliment supprimé."); refresh(n => n + 1);
    } catch { setMessage("Suppression impossible. Réessayez."); }
    finally { setBusy(false); }
  }

  const selected = editing || food;
  // Produit scanné sans valeurs nutritionnelles complètes : il compterait pour 0 kcal
  const unknownNutrition = Boolean(food && !editing && !hasNutrition(food));
  const calories = editing?.calories_100g ?? food?.calories ?? 0;
  const protein = editing?.protein_100g ?? food?.protein ?? 0;
  return (
    <>
      <form ref={formRef} onSubmit={save} className="rounded-2xl bg-white p-4 shadow-card dark:bg-gray-800">
        <fieldset disabled={busy} className="space-y-3">
          <legend className="mb-2 font-semibold">{editing ? "Modifier la saisie" : "Ajouter un aliment"}</legend>
          {selected ? (
            <div className="flex items-center justify-between gap-3">
              <strong>{label(selected)}</strong>
              <button type="button" onClick={clearForm} className="text-sm underline">{editing ? "Annuler" : "Changer"}</button>
            </div>
          ) : (
            <>
              <label className="block text-sm">Rechercher dans le catalogue
                <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom d’un aliment ou marque" className={fieldClass} />
              </label>
              {searchStatus && <p role="status" className="text-sm">{searchStatus}</p>}
              {matches.length > 0 && <ul className="max-h-48 overflow-auto divide-y">
                {matches.map(item => <li key={item.id}><button type="button" className="w-full py-2 text-left" onClick={() => {setFood(item); setSearch(""); setMessage("");}}>{label(item)}</button></li>)}
              </ul>}
              <Link href={`/scanner?date=${day}`} className="text-sm underline">Scanner un produit</Link>
            </>
          )}
          {selected && <>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Quantité mangée (g)
                <input required type="number" min="0.01" max="10000" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={fieldClass} />
              </label>
              <div className="text-sm">
                <label htmlFor="journal-meal">Repas</label>
                <select id="journal-meal" value={meal} onChange={e => setMeal(e.target.value as MealType)} className={fieldClass}>
                  {Object.entries(MEAL_LABELS).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                </select>
              </div>
            </div>
            {unknownNutrition && <p role="alert" className="text-sm text-amber-700">Valeurs nutritionnelles inconnues pour ce produit : il ne peut pas être ajouté au journal.</p>}
            {!unknownNutrition && validFoodAmount(Number(amount)) && <p className="text-sm">{Math.round(Number(amount) * calories / 100)} kcal · {(Number(amount) * protein / 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} g de protéines</p>}
            <button disabled={unknownNutrition || !validFoodAmount(Number(amount))} className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white disabled:opacity-50">{editing ? "Enregistrer la modification" : "Ajouter au journal"}</button>
          </>}
        </fieldset>
      </form>
      {message && <p role="status">{message}</p>}
      <h2 className="font-semibold">Aliments du jour sélectionné</h2>
      {listError ? <p role="alert">Journal indisponible. <button className="underline" onClick={() => refresh(n => n + 1)}>Réessayer</button></p> :
        !loaded ? <p>Chargement…</p> : !entries.length && <p className="text-sm">Aucun aliment saisi pour cette date.</p>}
      {entries.map(entry => <article key={entry.id} className="rounded-xl bg-white p-3 shadow-card dark:bg-gray-800">
        <h3 className="font-semibold">{label(entry)}</h3>
        <p className="text-sm">{MEAL_LABELS[entry.meal_type]} · {entry.grams.toLocaleString("fr-FR")} g · {Math.round(entry.grams * entry.calories_100g / 100)} kcal</p>
        <div className="mt-2 flex gap-4 text-sm">
          <button disabled={busy} onClick={() => {
            setEditing(entry); setAmount(String(entry.grams)); setMeal(entry.meal_type); setMessage("");
            formRef.current?.scrollIntoView({ block: "start" });
          }} className="underline">Modifier</button>
          <button disabled={busy} onClick={() => remove(entry)} className="underline">Supprimer</button>
        </div>
      </article>)}
    </>
  );
}
