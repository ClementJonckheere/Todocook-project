import { GOAL_LABELS, type NutritionGoal } from "@/lib/nutrition";

export function GoalSelect({ value, onChange }: {
  value: NutritionGoal;
  onChange: (goal: NutritionGoal) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      Objectif nutritionnel
      <select value={value} onChange={event => onChange(event.target.value as NutritionGoal)}
        className="mt-1 w-full rounded-lg border px-3 py-2 dark:bg-gray-700">
        {Object.entries(GOAL_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      {value !== "maintien" && <span className="mt-1 block text-xs font-normal text-gray-500">
        Estimation pour adulte, hors grossesse et allaitement.
      </span>}
    </label>
  );
}
