"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface Recipe {
  id: number;
  name: string;
  servings: number;
  calories: number;
  is_public: boolean;
  created_by: number | null;
  ingredient_names: string | null;
}

/** Recettes créées ou importées par l'utilisateur : modification et suppression. */
export default function MesRecettesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [message, setMessage] = useState("");

  const fetchRecipes = useCallback(async (): Promise<Recipe[]> => {
    const res = await fetch(apiUrl("/api/recipes?onlyUser=true"));
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  }, []);
  const load = useCallback(async () => setRecipes(await fetchRecipes()), [fetchRecipes]);

  useEffect(() => {
    let cancelled = false;
    fetchRecipes().then((list) => { if (!cancelled) setRecipes(list); });
    return () => { cancelled = true; };
  }, [fetchRecipes]);

  const remove = async (recipe: Recipe) => {
    if (!window.confirm(`Supprimer « ${recipe.name} » ?`)) return;
    const res = await fetch(apiUrl(`/api/recipes/${recipe.id}`), { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? `« ${recipe.name} » supprimée.` : data.error || "Suppression impossible.");
    if (res.ok) load();
  };

  const mine = (recipes ?? []).filter((recipe) => user && recipe.created_by === user.id);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 dark:bg-gray-900">
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-600" aria-label="Retour"><ArrowLeft size={22} /></button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mes recettes</h1>
          <Link href="/creation-recette" className="ml-auto flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-2 text-sm font-medium text-white">
            <Plus size={16} /> Créer
          </Link>
        </div>
      </div>

      <div className="mt-4 space-y-3 px-4">
        {message && <p role="status" className="text-sm text-gray-700 dark:text-gray-200">{message}</p>}
        {recipes === null ? (
          <p className="text-sm text-gray-500">Chargement…</p>
        ) : mine.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-500 dark:bg-gray-800">
            Vous n&apos;avez pas encore créé de recette.
          </p>
        ) : (
          mine.map((recipe) => (
            <div key={recipe.id} className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900 dark:text-white">{recipe.name}</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {Math.round(recipe.calories / Math.max(recipe.servings, 1))} kcal / portion · {recipe.servings} portion(s)
                    {recipe.is_public ? " · publique" : " · privée"}
                  </p>
                  {recipe.ingredient_names && <p className="mt-1 truncate text-xs text-gray-400">{recipe.ingredient_names}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/creation-recette?id=${recipe.id}`} aria-label={`Modifier ${recipe.name}`}
                    className="rounded-lg bg-gray-100 p-2 text-gray-700 dark:bg-gray-700 dark:text-gray-200"><Pencil size={16} /></Link>
                  <button onClick={() => remove(recipe)} aria-label={`Supprimer ${recipe.name}`}
                    className="rounded-lg bg-red-50 p-2 text-red-600 dark:bg-red-900/30"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
