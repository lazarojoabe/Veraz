export const nutritionUnits = ["g", "ml", "unit", "portion"] as const;

export type NutritionUnit = (typeof nutritionUnits)[number];

export type NutritionValues = {
  calories: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
  fiberG: number | null;
  sodiumMg: number | null;
};

export type FoodCatalogItem = NutritionValues & {
  id: string;
  name: string;
  preparation: string | null;
  source: "taco" | "tbca" | "verified" | "open_food_facts" | "custom";
  sourceReference: string | null;
  sourceUrl?: string | null;
  brand?: string | null;
  barcode?: string | null;
  reviewStatus?: "official" | "reviewed" | "user";
  baseQuantity: number;
  baseUnit: NutritionUnit;
  gramsPerUnit: number | null;
  densityGMl: number | null;
};

export type MealDraftItem = {
  foodId: string;
  quantity: number;
  unit: NutritionUnit;
};

export type CalculatedMealItem = NutritionValues & MealDraftItem & {
  foodName: string;
  preparation: string | null;
  source: FoodCatalogItem["source"];
  sourceReference: string | null;
  convertedGrams: number | null;
};

export type MealTotals = NutritionValues;

export type NutritionGoals = {
  calories: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
};
