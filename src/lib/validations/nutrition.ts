import { z } from "zod";
import { nutritionUnits } from "@/types/nutrition";

export const mealTypeSchema = z.enum(["breakfast", "lunch", "snack", "dinner", "supper", "other"]);

export const mealInputSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome à refeição.").max(100),
  mealType: mealTypeSchema,
  eatenAt: z.iso.datetime({ offset: true }),
  notes: z.string().trim().max(1000).default(""),
  items: z
    .array(
      z.object({
        foodId: z.uuid(),
        quantity: z.number().positive().max(100000),
        unit: z.enum(nutritionUnits),
      }),
    )
    .min(1, "Adicione ao menos um alimento.")
    .max(50),
});

export const mealCreationSchema = mealInputSchema.extend({
  source: z.enum(["manual", "voice", "photo"]).default("manual"),
});

export const nutritionGoalsSchema = z.object({
  calories: z.number().positive().max(20000),
  proteinG: z.number().nonnegative().max(2000),
  carbohydratesG: z.number().nonnegative().max(3000),
  fatG: z.number().nonnegative().max(2000),
});

export const customFoodSchema = z.object({
  name: z.string().trim().min(2).max(160),
  preparation: z.string().trim().max(120).nullable().default(null),
  calories: z.number().nonnegative().max(5000),
  proteinG: z.number().nonnegative().max(500),
  carbohydratesG: z.number().nonnegative().max(500),
  fatG: z.number().nonnegative().max(500),
  fiberG: z.number().nonnegative().max(200).nullable().default(null),
  sodiumMg: z.number().nonnegative().max(100000).nullable().default(null),
  gramsPerUnit: z.number().positive().max(10000).nullable().default(null),
  sourceUrl: z.url().max(500).nullable().default(null),
  suggestForCatalog: z.boolean().default(false),
});

export const mealTemplateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(""),
  items: mealInputSchema.shape.items,
});

export const historyPeriodSchema = z.enum(["7", "30", "90"]).transform(Number);
