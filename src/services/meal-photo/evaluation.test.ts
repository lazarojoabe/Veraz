import { describe, expect, it } from "vitest";
import { calculateMealPhotoMetrics } from "./evaluation";
import type { MealPhotoEvaluationRow } from "@/types/meal-photo";

const predicted = {
  foodId: "10000000-0000-4000-8000-000000000001",
  quantity: 100,
  unit: "g" as const,
  visibleName: "arroz",
  preparation: "cozido",
  estimatedGrams: { minimum: 80, likely: 100, maximum: 130 },
  modelConfidence: "medium" as const,
  catalogMatchConfidence: 0.9,
  portionBasis: "um quarto do prato",
};

describe("calculateMealPhotoMetrics", () => {
  it("separa correção visual de erro medido com balança", () => {
    const rows: MealPhotoEvaluationRow[] = [{
      predictedItems: [predicted],
      rawAnalysis: {
        scene: { quality: "good", issues: [], plateVisible: true, referenceObjectVisible: false },
        items: [{
          visibleName: "arroz", preparation: "cozido", estimatedGrams: predicted.estimatedGrams,
          confidence: "medium", portionBasis: predicted.portionBasis, catalogSearchTerms: ["arroz"],
        }],
        caveats: [],
      },
      confirmedItems: [{ foodId: predicted.foodId, predictedGrams: 100, confirmedGrams: 120 }],
      measurementMethod: "weighed",
      reviewDurationMs: 12_000,
      status: "confirmed",
    }];

    expect(calculateMealPhotoMetrics(rows)).toMatchObject({
      analyses: 1,
      confirmedAnalyses: 1,
      weighedSamples: 1,
      catalogMatchRate: 1,
      averageReviewSeconds: 12,
      correctionRate: 1,
      meanAbsoluteGramCorrection: 20,
      weighedMeanAbsoluteGramError: 20,
      weighedMeanAbsolutePercentageError: 20,
    });
  });
});

