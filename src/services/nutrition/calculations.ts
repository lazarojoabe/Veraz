import type {
  CalculatedMealItem,
  FoodCatalogItem,
  MealDraftItem,
  MealTotals,
  NutritionUnit,
} from "@/types/nutrition";

const precision = 1000;

export function roundNutrition(value: number) {
  return Math.round((value + Number.EPSILON) * precision) / precision;
}

export function getAvailableUnits(food: FoodCatalogItem): NutritionUnit[] {
  const units = new Set<NutritionUnit>([food.baseUnit]);

  if (food.gramsPerUnit) {
    units.add("unit");
    units.add("portion");
    units.add("g");
  }

  if (food.densityGMl) {
    units.add("g");
    units.add("ml");
  }

  return [...units];
}

export function convertToBaseQuantity(
  food: FoodCatalogItem,
  quantity: number,
  unit: NutritionUnit,
) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("A quantidade precisa ser maior que zero.");
  }

  if (unit === food.baseUnit) return quantity;

  const grams = convertToGrams(food, quantity, unit);

  if (food.baseUnit === "g" && grams !== null) return grams;
  if (food.baseUnit === "ml" && grams !== null && food.densityGMl) return grams / food.densityGMl;
  if ((food.baseUnit === "unit" || food.baseUnit === "portion") && grams !== null && food.gramsPerUnit) {
    return grams / food.gramsPerUnit;
  }

  throw new Error(`Conversão de ${unit} para ${food.baseUnit} indisponível para ${food.name}.`);
}

export function convertToGrams(
  food: FoodCatalogItem,
  quantity: number,
  unit: NutritionUnit,
): number | null {
  if (unit === "g") return quantity;
  if (unit === "ml" && food.densityGMl) return quantity * food.densityGMl;
  if ((unit === "unit" || unit === "portion") && food.gramsPerUnit) {
    return quantity * food.gramsPerUnit;
  }
  if (unit === food.baseUnit && food.baseUnit === "ml" && food.densityGMl) {
    return quantity * food.densityGMl;
  }
  return null;
}

export function calculateMealItem(food: FoodCatalogItem, item: MealDraftItem): CalculatedMealItem {
  if (food.id !== item.foodId) throw new Error("O alimento não corresponde ao item informado.");

  const baseQuantity = convertToBaseQuantity(food, item.quantity, item.unit);
  const factor = baseQuantity / food.baseQuantity;
  const scale = (value: number | null) => (value === null ? null : roundNutrition(value * factor));

  return {
    ...item,
    foodName: food.name,
    preparation: food.preparation,
    source: food.source,
    sourceReference: food.sourceReference,
    convertedGrams: (() => {
      const grams = convertToGrams(food, item.quantity, item.unit);
      return grams === null ? null : roundNutrition(grams);
    })(),
    calories: scale(food.calories) ?? 0,
    proteinG: scale(food.proteinG) ?? 0,
    carbohydratesG: scale(food.carbohydratesG) ?? 0,
    fatG: scale(food.fatG) ?? 0,
    fiberG: scale(food.fiberG),
    sodiumMg: scale(food.sodiumMg),
  };
}

export function calculateMealTotals(items: CalculatedMealItem[]): MealTotals {
  const sum = (key: "calories" | "proteinG" | "carbohydratesG" | "fatG") =>
    roundNutrition(items.reduce((total, item) => total + item[key], 0));
  const sumOptional = (key: "fiberG" | "sodiumMg") => {
    const values = items.map((item) => item[key]).filter((value): value is number => value !== null);
    return values.length ? roundNutrition(values.reduce((total, value) => total + value, 0)) : null;
  };

  return {
    calories: sum("calories"),
    proteinG: sum("proteinG"),
    carbohydratesG: sum("carbohydratesG"),
    fatG: sum("fatG"),
    fiberG: sumOptional("fiberG"),
    sodiumMg: sumOptional("sodiumMg"),
  };
}
