import { z } from "zod";
import { muscleGroups } from "@/types/training";

export const customExerciseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  muscleGroup: z.enum(muscleGroups),
  equipment: z.string().trim().max(80).nullable().default(null),
  trackingType: z.enum(["weight_reps", "bodyweight_reps"]).default("weight_reps"),
});

const planExerciseSchema = z.object({
  exerciseId: z.uuid(),
  targetSets: z.number().int().min(1).max(20),
  targetReps: z.number().int().min(1).max(1000),
  restSeconds: z.number().int().min(0).max(3600).default(90),
});

export const workoutPlanSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).default(""),
  exercises: z.array(planExerciseSchema).min(1).max(40),
}).superRefine((value, context) => {
  if (new Set(value.exercises.map((exercise) => exercise.exerciseId)).size !== value.exercises.length) {
    context.addIssue({ code: "custom", message: "Não repita exercícios na mesma ficha.", path: ["exercises"] });
  }
});

const workoutSetSchema = z.object({
  weightKg: z.number().min(0).max(2000),
  reps: z.number().int().min(1).max(1000),
});

export const workoutSessionSchema = z.object({
  planId: z.uuid().nullable().default(null),
  name: z.string().trim().min(2).max(100),
  performedAt: z.iso.datetime({ offset: true }),
  notes: z.string().trim().max(1000).default(""),
  exercises: z.array(z.object({
    exerciseId: z.uuid(),
    sets: z.array(workoutSetSchema).min(1).max(100),
  })).min(1).max(40),
}).superRefine((value, context) => {
  if (new Set(value.exercises.map((exercise) => exercise.exerciseId)).size !== value.exercises.length) {
    context.addIssue({ code: "custom", message: "Não repita exercícios no mesmo treino.", path: ["exercises"] });
  }
});

export const trainingPeriodSchema = z.enum(["30", "90", "365"]).transform(Number);

