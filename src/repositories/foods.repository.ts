import { searchDemoFoods } from "@/data/foods";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { FoodCatalogItem, NutritionUnit } from "@/types/nutrition";

type FoodRow = {
  id: string;
  name: string;
  preparation: string | null;
  source: FoodCatalogItem["source"];
  source_reference: string | null;
  base_quantity: number | string;
  base_unit: NutritionUnit;
  calories: number | string;
  protein_g: number | string;
  carbohydrates_g: number | string;
  fat_g: number | string;
  fiber_g: number | string | null;
  sodium_mg: number | string | null;
  grams_per_unit: number | string | null;
  density_g_ml: number | string | null;
};

const columns = "id,name,preparation,source,source_reference,base_quantity,base_unit,calories,protein_g,carbohydrates_g,fat_g,fiber_g,sodium_mg,grams_per_unit,density_g_ml";
const optionalNumber = (value: number | string | null) => (value === null ? null : Number(value));

export function mapFood(row: FoodRow): FoodCatalogItem {
  return {
    id: row.id,
    name: row.name,
    preparation: row.preparation,
    source: row.source,
    sourceReference: row.source_reference,
    baseQuantity: Number(row.base_quantity),
    baseUnit: row.base_unit,
    calories: Number(row.calories),
    proteinG: Number(row.protein_g),
    carbohydratesG: Number(row.carbohydrates_g),
    fatG: Number(row.fat_g),
    fiberG: optionalNumber(row.fiber_g),
    sodiumMg: optionalNumber(row.sodium_mg),
    gramsPerUnit: optionalNumber(row.grams_per_unit),
    densityGMl: optionalNumber(row.density_g_ml),
  };
}

export async function createCustomFood(
  userId: string,
  input: {
    name: string;
    preparation: string | null;
    calories: number;
    proteinG: number;
    carbohydratesG: number;
    fatG: number;
    fiberG: number | null;
    sodiumMg: number | null;
    gramsPerUnit: number | null;
  },
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foods")
    .insert({
      user_id: userId,
      name: input.name,
      preparation: input.preparation,
      source: "custom",
      source_reference: "Informado pelo usuário",
      base_quantity: 100,
      base_unit: "g",
      calories: input.calories,
      protein_g: input.proteinG,
      carbohydrates_g: input.carbohydratesG,
      fat_g: input.fatG,
      fiber_g: input.fiberG,
      sodium_mg: input.sodiumMg,
      grams_per_unit: input.gramsPerUnit,
    })
    .select(columns)
    .single();

  if (error) throw new Error("Não foi possível criar o alimento.");
  return mapFood(data as FoodRow);
}

export async function searchFoods(query: string) {
  if (!isSupabaseConfigured()) return searchDemoFoods(query).slice(0, 20);

  const supabase = await createClient();
  let request = supabase.from("foods").select(columns).eq("is_active", true).order("name").limit(20);
  if (query.trim()) request = request.ilike("name", `%${query.trim().replaceAll("%", "\\%")}%`);

  const { data, error } = await request;
  if (error) throw new Error("Não foi possível consultar o catálogo nutricional.");
  return (data as FoodRow[]).map(mapFood);
}

export async function getFoodsByIds(ids: string[]) {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("foods").select(columns).in("id", ids).eq("is_active", true);
  if (error) throw new Error("Não foi possível carregar os alimentos.");
  return (data as FoodRow[]).map(mapFood);
}

export async function listFoodsForMatching(limit = 1000) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foods")
    .select(columns)
    .eq("is_active", true)
    .order("name")
    .limit(limit);
  if (error) throw new Error("Não foi possível carregar o catálogo para transcrição.");
  return (data as FoodRow[]).map(mapFood);
}
