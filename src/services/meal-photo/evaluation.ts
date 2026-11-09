import type { MealPhotoEvaluationRow } from "@/types/meal-photo";

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function calculateMealPhotoMetrics(rows: MealPhotoEvaluationRow[]) {
  const confirmed = rows.filter((row) => row.status === "confirmed" && row.confirmedItems?.length);
  const weighed = confirmed.filter((row) => row.measurementMethod === "weighed");
  const rawItemCount = rows.reduce((sum, row) => sum + row.rawAnalysis.items.length, 0);
  const matchedItemCount = rows.reduce((sum, row) => sum + row.predictedItems.length, 0);
  const reviewDurations = confirmed.flatMap((row) => row.reviewDurationMs === null ? [] : [row.reviewDurationMs / 1000]);
  const corrections = confirmed.flatMap((row) => row.confirmedItems ?? []).map((item) => ({
    absolute: Math.abs(item.confirmedGrams - item.predictedGrams),
    percentage: item.predictedGrams > 0 ? Math.abs(item.confirmedGrams - item.predictedGrams) / item.predictedGrams * 100 : null,
    materiallyChanged: Math.abs(item.confirmedGrams - item.predictedGrams) > Math.max(5, item.predictedGrams * 0.05),
  }));
  const weighedCorrections = weighed.flatMap((row) => row.confirmedItems ?? []).map((item) => ({
    absolute: Math.abs(item.confirmedGrams - item.predictedGrams),
    percentage: item.predictedGrams > 0 ? Math.abs(item.confirmedGrams - item.predictedGrams) / item.predictedGrams * 100 : null,
  }));

  return {
    analyses: rows.length,
    confirmedAnalyses: confirmed.length,
    weighedSamples: weighed.length,
    weighedSampleTarget: 100,
    weighedSampleProgress: Math.min(1, weighed.length / 100),
    catalogMatchRate: rawItemCount ? matchedItemCount / rawItemCount : null,
    averageReviewSeconds: average(reviewDurations),
    correctionRate: corrections.length ? corrections.filter((item) => item.materiallyChanged).length / corrections.length : null,
    meanAbsoluteGramCorrection: average(corrections.map((item) => item.absolute)),
    weighedMeanAbsoluteGramError: average(weighedCorrections.map((item) => item.absolute)),
    weighedMeanAbsolutePercentageError: average(weighedCorrections.flatMap((item) => item.percentage === null ? [] : [item.percentage])),
  };
}

