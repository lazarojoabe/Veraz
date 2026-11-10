import { z } from "zod";

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().transform((value) => value || undefined);

export const accountRoleSchema = z.object({ role: z.enum(["athlete", "coach"]) });
export const coachInviteSchema = z.object({ inviteCode: z.string().trim().toUpperCase().regex(/^[A-F0-9]{6,16}$/) });
export const weightLogSchema = z.object({ weightKg: z.coerce.number().min(20).max(500), recordedAt: z.string().date(), note: optionalText(500) });
export const nutritionPrescriptionSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().trim().min(2).max(100),
  calories: z.coerce.number().int().min(0).max(15000),
  proteinG: z.coerce.number().int().min(0).max(1000),
  carbohydratesG: z.coerce.number().int().min(0).max(2000),
  fatG: z.coerce.number().int().min(0).max(1000),
  instructions: optionalText(3000),
});

export const coachWorkoutPlanSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  description: optionalText(500),
  exercises: z.array(z.object({
    exerciseId: z.string().uuid(),
    targetSets: z.coerce.number().int().min(1).max(20),
    targetReps: z.coerce.number().int().min(1).max(1000),
    restSeconds: z.coerce.number().int().min(0).max(3600),
  })).min(1).max(40),
});
