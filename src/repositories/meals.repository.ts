import { createClient } from "@/lib/supabase/server";
import type { z } from "zod";
import type { mealInputSchema } from "@/lib/validations/nutrition";

export type MealInput = z.infer<typeof mealInputSchema>;

export type MealSummary = {
  id: string;
  name: string;
  mealType: MealInput["mealType"];
  eatenAt: string;
  calories: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
  itemCount: number;
  items: Array<{
    foodName: string;
    quantity: number;
    unit: MealInput["items"][number]["unit"];
    calories: number;
    proteinG: number;
    carbohydratesG: number;
    fatG: number;
  }>;
};

type MealRow = {
  id: string;
  name: string;
  meal_type: MealInput["mealType"];
  eaten_at: string;
  calories_total: number | string;
  protein_total_g: number | string;
  carbohydrates_total_g: number | string;
  fat_total_g: number | string;
  meal_items: Array<{
    food_name: string;
    quantity: number | string;
    unit: MealInput["items"][number]["unit"];
    calories: number | string;
    protein_g: number | string;
    carbohydrates_g: number | string;
    fat_g: number | string;
    position: number;
  }>;
};

export async function createMeal(input: MealInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_meal_with_items", {
    p_name: input.name,
    p_meal_type: input.mealType,
    p_eaten_at: input.eatenAt,
    p_notes: input.notes,
    p_items: input.items,
  });

  if (error) throw new Error("Não foi possível salvar a refeição.");
  return data as string;
}

export async function createVoiceMeal(input: MealInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_voice_meal_with_items", {
    p_name: input.name,
    p_meal_type: input.mealType,
    p_eaten_at: input.eatenAt,
    p_notes: input.notes,
    p_items: input.items,
  });
  if (error) throw new Error("Não foi possível salvar a refeição por voz.");
  return data as string;
}

export async function createPhotoMeal(input: MealInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_photo_meal_with_items", {
    p_name: input.name,
    p_meal_type: input.mealType,
    p_eaten_at: input.eatenAt,
    p_notes: input.notes,
    p_items: input.items,
  });
  if (error) throw new Error("Não foi possível salvar a refeição analisada por foto.");
  return data as string;
}

export async function replaceMeal(userId: string, mealId: string, input: MealInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("replace_meal_with_items", {
    p_meal_id: mealId,
    p_name: input.name,
    p_meal_type: input.mealType,
    p_eaten_at: input.eatenAt,
    p_notes: input.notes,
    p_items: input.items,
  });

  if (error) throw new Error("Não foi possível atualizar a refeição.");
  return data as string;
}

export async function getMeal(userId: string, mealId: string) {
  const supabase = await createClient();
  const { data: meal, error: mealError } = await supabase
    .from("meals")
    .select("id,name,meal_type,eaten_at,notes")
    .eq("id", mealId)
    .eq("user_id", userId)
    .single();
  if (mealError) throw new Error("Refeição não encontrada.");

  const { data: items, error: itemsError } = await supabase
    .from("meal_items")
    .select("food_id,quantity,unit")
    .eq("meal_id", mealId)
    .order("position");
  if (itemsError) throw new Error("Não foi possível carregar os itens.");

  return {
    id: meal.id as string,
    name: meal.name as string,
    mealType: meal.meal_type as MealInput["mealType"],
    eatenAt: meal.eaten_at as string,
    notes: (meal.notes as string | null) ?? "",
    items: (items as { food_id: string | null; quantity: number | string; unit: MealInput["items"][number]["unit"] }[])
      .filter((item): item is typeof item & { food_id: string } => Boolean(item.food_id))
      .map((item) => ({ foodId: item.food_id, quantity: Number(item.quantity), unit: item.unit })),
  };
}

export async function listMeals(
  userId: string,
  options: { limit?: number; since?: string } = {},
): Promise<MealSummary[]> {
  const supabase = await createClient();
  let request = supabase
    .from("meals")
    .select("id,name,meal_type,eaten_at,calories_total,protein_total_g,carbohydrates_total_g,fat_total_g,meal_items(food_name,quantity,unit,calories,protein_g,carbohydrates_g,fat_g,position)")
    .eq("user_id", userId)
    .order("eaten_at", { ascending: false });
  if (options.since) request = request.gte("eaten_at", options.since);
  const { data, error } = await request.limit(options.limit ?? 100);

  if (error) throw new Error("Não foi possível carregar o histórico.");

  return (data as MealRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    mealType: row.meal_type,
    eatenAt: row.eaten_at,
    calories: Number(row.calories_total),
    proteinG: Number(row.protein_total_g),
    carbohydratesG: Number(row.carbohydrates_total_g),
    fatG: Number(row.fat_total_g),
    itemCount: row.meal_items.length,
    items: [...row.meal_items].sort((a, b) => a.position - b.position).map((item) => ({
      foodName: item.food_name,
      quantity: Number(item.quantity),
      unit: item.unit,
      calories: Number(item.calories),
      proteinG: Number(item.protein_g),
      carbohydratesG: Number(item.carbohydrates_g),
      fatG: Number(item.fat_g),
    })),
  }));
}

export async function deleteMeal(userId: string, mealId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("meals").delete().eq("id", mealId).eq("user_id", userId);
  if (error) throw new Error("Não foi possível excluir a refeição.");
}
