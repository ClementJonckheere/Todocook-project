/** Échappe les jokers LIKE/ILIKE (%, _ et \) pour qu'une saisie soit cherchée littéralement. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
