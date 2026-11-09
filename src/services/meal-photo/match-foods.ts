import type { FoodCatalogItem } from "@/types/nutrition";
import type { MealPhotoDetectedItem, MealPhotoModelAnalysis, ResolvedMealPhotoItem } from "@/types/meal-photo";

const ignoredTokens = new Set([
  "com", "sem", "tipo", "para", "uma", "porcao", "alimento", "preparado", "cozido", "cozida",
  "grelhado", "grelhada", "frito", "frita", "assado", "assada", "cru", "crua", "inteiro", "inteira",
]);

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(value: string) {
  return normalize(value).split(" ").filter((token) => token.length >= 3 && !ignoredTokens.has(token));
}

function scoreCandidate(item: MealPhotoDetectedItem, food: FoodCatalogItem) {
  const observed = normalize([item.visibleName, item.preparation ?? "", ...item.catalogSearchTerms].join(" "));
  const catalogName = normalize(food.name);
  if (observed.includes(catalogName)) return 1;

  const foodTokens = tokens(food.name);
  if (!foodTokens.length) return 0;
  const observedTokens = new Set(tokens(observed));
  const overlap = foodTokens.filter((token) => observedTokens.has(token)).length / foodTokens.length;
  const preparationTokens = tokens(food.preparation ?? "");
  const preparationOverlap = preparationTokens.some((token) => observedTokens.has(token)) ? 0.12 : 0;
  const firstTokenBonus = foodTokens[0] && observedTokens.has(foodTokens[0]) ? 0.18 : 0;
  return Math.min(1, overlap * 0.72 + preparationOverlap + firstTokenBonus);
}

export function matchMealPhotoToCatalog(analysis: MealPhotoModelAnalysis, foods: FoodCatalogItem[]) {
  const items: ResolvedMealPhotoItem[] = [];
  const unresolved: MealPhotoDetectedItem[] = [];

  for (const detected of analysis.items) {
    const candidate = foods
      .map((food) => ({ food, score: scoreCandidate(detected, food) }))
      .sort((a, b) => b.score - a.score)[0];
    if (!candidate || candidate.score < 0.3) {
      unresolved.push(detected);
      continue;
    }
    items.push({
      foodId: candidate.food.id,
      quantity: Math.round(detected.estimatedGrams.likely),
      unit: "g",
      visibleName: detected.visibleName,
      preparation: detected.preparation,
      estimatedGrams: detected.estimatedGrams,
      modelConfidence: detected.confidence,
      catalogMatchConfidence: Number(candidate.score.toFixed(3)),
      portionBasis: detected.portionBasis,
    });
  }

  const matchedIds = new Set(items.map((item) => item.foodId));
  return { items, unresolved, foods: foods.filter((food) => matchedIds.has(food.id)) };
}

