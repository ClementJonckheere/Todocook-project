"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";

const dayLabels = ["", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function NewRoutinePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom est requis");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(apiUrl("/api/routines"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          days_of_week: daysOfWeek,
        }),
      });

      if (!res.ok) {
        throw new Error("Échec de la création");
      }

      const routine = await res.json();
      router.push(`/sport/routines/${routine.id}`);
    } catch (err) {
      setError("Erreur lors de la création de la routine");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-card">
        <div className="px-4 pt-12 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/sport/routines"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </Link>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Nouvelle routine
            </h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-4 pt-6 pb-24">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Nom de la routine *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Push Day, Full Body, Jambes..."
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl shadow-card border-0 outline-none text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Description (optionnel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Séance pectoraux, épaules et triceps"
              rows={3}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl shadow-card border-0 outline-none text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          {/* Days of week */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Jours d&apos;entraînement
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Sélectionnez les jours où cette routine doit être effectuée
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                    daysOfWeek.includes(day)
                      ? "bg-primary-500 text-white shadow-card"
                      : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 shadow-card"
                  }`}
                >
                  {dayLabels[day]}
                </button>
              ))}
            </div>
          </div>

          {/* Templates */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Suggestions de programmes
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setName("Push Pull Legs - Push");
                  setDescription("Pectoraux, épaules, triceps");
                  setDaysOfWeek([1, 4]);
                }}
                className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl shadow-card text-left hover:shadow-card-hover transition-all"
              >
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  Push (PPL)
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pectoraux, épaules, triceps • Lun, Jeu
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setName("Push Pull Legs - Pull");
                  setDescription("Dos, biceps, arrière d'épaules");
                  setDaysOfWeek([2, 5]);
                }}
                className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl shadow-card text-left hover:shadow-card-hover transition-all"
              >
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  Pull (PPL)
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Dos, biceps • Mar, Ven
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setName("Push Pull Legs - Legs");
                  setDescription("Quadriceps, ischio-jambiers, mollets, fessiers");
                  setDaysOfWeek([3, 6]);
                }}
                className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl shadow-card text-left hover:shadow-card-hover transition-all"
              >
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  Legs (PPL)
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Jambes, fessiers • Mer, Sam
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setName("Full Body");
                  setDescription("Entraînement complet du corps");
                  setDaysOfWeek([1, 3, 5]);
                }}
                className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl shadow-card text-left hover:shadow-card-hover transition-all"
              >
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  Full Body
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Corps entier • Lun, Mer, Ven
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-warm-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full py-4 bg-primary-500 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-card"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Save size={18} />
                Créer la routine
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
