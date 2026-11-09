import type { FoodCatalogItem, NutritionUnit } from "@/types/nutrition";

export type MealPhotoConfidence = "low" | "medium" | "high";

export type MealPhotoDetectedItem = {
  visibleName: string;
  preparation: string | null;
  estimatedGrams: {
    minimum: number;
    likely: number;
    maximum: number;
  };
  confidence: MealPhotoConfidence;
  portionBasis: string;
  catalogSearchTerms: string[];
};

export type MealPhotoModelAnalysis = {
  scene: {
    quality: "good" | "limited" | "unusable";
    issues: string[];
    plateVisible: boolean;
    referenceObjectVisible: boolean;
  };
  items: MealPhotoDetectedItem[];
  caveats: string[];
};

export type ResolvedMealPhotoItem = {
  foodId: string;
  quantity: number;
  unit: Extract<NutritionUnit, "g">;
  visibleName: string;
  preparation: string | null;
  estimatedGrams: MealPhotoDetectedItem["estimatedGrams"];
  modelConfidence: MealPhotoConfidence;
  catalogMatchConfidence: number;
  portionBasis: string;
};

export type MealPhotoAnalysisResponse = {
  analysisId: string | null;
  scene: MealPhotoModelAnalysis["scene"];
  items: ResolvedMealPhotoItem[];
  unresolved: MealPhotoDetectedItem[];
  caveats: string[];
  foods: FoodCatalogItem[];
  model: string;
  latencyMs: number;
};

export type MealPhotoEvaluationRow = {
  predictedItems: ResolvedMealPhotoItem[];
  rawAnalysis: MealPhotoModelAnalysis;
  confirmedItems: Array<{
    foodId: string;
    predictedGrams: number;
    confirmedGrams: number;
  }> | null;
  measurementMethod: "visual_review" | "weighed" | null;
  reviewDurationMs: number | null;
  status: "completed" | "confirmed" | "discarded";
};

