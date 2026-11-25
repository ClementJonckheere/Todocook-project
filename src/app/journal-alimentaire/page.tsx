import { query } from "@/lib/db";
import { journalDate } from "@/lib/food-journal";
import { FoodJournal } from "./FoodJournal";

export default async function JournalPage(props: {
  searchParams: Promise<{ date?: string; aliment?: string }>;
}) {
  const searchParams = await props.searchParams;
  const id = Number(searchParams.aliment);
  const food = Number.isSafeInteger(id) && id > 0 && id <= 2147483647
    ? (await query("SELECT id, name, brand, calories, protein, carbs, fat FROM ingredients WHERE id=$1", [id])).rows[0]
    : null;
  return <FoodJournal initialFood={food ?? null} initialDate={journalDate(searchParams.date) ? searchParams.date : null} />;
}
