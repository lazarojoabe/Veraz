import { z } from "zod";

export const mealPhotoModelAnalysisSchema = z.object({
  scene: z.object({
    quality: z.enum(["good", "limited", "unusable"]),
    issues: z.array(z.string().trim().min(1).max(160)).max(8),
    plateVisible: z.boolean(),
    referenceObjectVisible: z.boolean(),
  }),
  items: z.array(z.object({
    visibleName: z.string().trim().min(1).max(120),
    preparation: z.string().trim().min(1).max(120).nullable(),
    estimatedGrams: z.object({
      minimum: z.number().positive().max(5000),
      likely: z.number().positive().max(5000),
      maximum: z.number().positive().max(5000),
    }),
    confidence: z.enum(["low", "medium", "high"]),
    portionBasis: z.string().trim().min(1).max(240),
    catalogSearchTerms: z.array(z.string().trim().min(1).max(80)).min(1).max(5),
  })).max(30),
  caveats: z.array(z.string().trim().min(1).max(240)).max(8),
});

export const mealPhotoConfirmationSchema = z.object({
  mealId: z.uuid(),
  reviewDurationMs: z.number().int().nonnegative().max(24 * 60 * 60 * 1000),
  measurementMethod: z.enum(["visual_review", "weighed"]),
  items: z.array(z.object({
    foodId: z.uuid(),
    predictedGrams: z.number().nonnegative().max(5000),
    confirmedGrams: z.number().positive().max(5000),
  })).min(1).max(50),
});

export type MealPhotoConfirmation = z.infer<typeof mealPhotoConfirmationSchema>;

