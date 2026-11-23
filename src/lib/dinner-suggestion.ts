/** Compare dinner recipes against one third of the user's daily targets.
 * Quarter portions are easier to serve. These bounds only apply to suggestions.
 */
export function dinnerSuggestion(calories: number, protein: number, dailyCalories: number, dailyProtein: number) {
  if (!(calories > 0 && dailyCalories > 0 && dailyProtein > 0)) {
    return { portions: 1, distance: Number.POSITIVE_INFINITY };
  }
  const targetCalories = dailyCalories / 3;
  const targetProtein = dailyProtein / 3;
  const portions = Math.max(0.75, Math.min(2, Math.round(4 * targetCalories / calories) / 4));
  const energyGap = Math.abs(calories * portions / targetCalories - 1);
  const proteinGap = Math.abs(protein * portions / targetProtein - 1);
  return { portions, distance: energyGap + 0.35 * proteinGap + 0.1 * Math.abs(portions - 1) };
}
