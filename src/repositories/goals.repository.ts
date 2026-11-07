import { createClient } from "@/lib/supabase/server";
import type { NutritionGoals } from "@/types/nutrition";

type GoalsRow = {
  calories: number | string;
  protein_g: number | string;
  carbohydrates_g: number | string;
  fat_g: number | string;
};

function mapGoals(row: GoalsRow): NutritionGoals {
  return {
    calories: Number(row.calories),
    proteinG: Number(row.protein_g),
    carbohydratesG: Number(row.carbohydrates_g),
    fatG: Number(row.fat_g),
  };
}

export async function getGoals(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nutrition_goals")
    .select("calories,protein_g,carbohydrates_g,fat_g")
    .eq("user_id", userId)
    .single();

  if (error) throw new Error("Não foi possível carregar suas metas.");
  return mapGoals(data as GoalsRow);
}

export async function saveGoals(userId: string, goals: NutritionGoals) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nutrition_goals")
    .upsert(
      {
        user_id: userId,
        calories: goals.calories,
        protein_g: goals.proteinG,
        carbohydrates_g: goals.carbohydratesG,
        fat_g: goals.fatG,
      },
      { onConflict: "user_id" },
    )
    .select("calories,protein_g,carbohydrates_g,fat_g")
    .single();

  if (error) throw new Error("Não foi possível salvar suas metas.");
  return mapGoals(data as GoalsRow);
}
