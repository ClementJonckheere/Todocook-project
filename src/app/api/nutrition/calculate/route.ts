import { NextResponse } from "next/server";
import { calculateNutrition, type Gender, type ActivityLevel, type SportType } from "@/lib/nutrition";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { age, weight, height, gender, activity_level, sport_type } = body;

    // Validate required fields
    if (!age || !weight || !height || !gender || !activity_level) {
      return NextResponse.json(
        { error: "Tous les champs sont requis (age, weight, height, gender, activity_level)" },
        { status: 400 }
      );
    }

    // Validate ranges
    if (age < 10 || age > 120) {
      return NextResponse.json({ error: "L'âge doit être entre 10 et 120 ans" }, { status: 400 });
    }
    if (weight < 20 || weight > 300) {
      return NextResponse.json({ error: "Le poids doit être entre 20 et 300 kg" }, { status: 400 });
    }
    if (height < 100 || height > 250) {
      return NextResponse.json({ error: "La taille doit être entre 100 et 250 cm" }, { status: 400 });
    }

    const result = calculateNutrition({
      age: Number(age),
      weight: Number(weight),
      height: Number(height),
      gender: gender as Gender,
      activityLevel: activity_level as ActivityLevel,
      sportType: (sport_type as SportType) || "aucun",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Nutrition calculation error:", error);
    return NextResponse.json({ error: "Erreur lors du calcul" }, { status: 500 });
  }
}
