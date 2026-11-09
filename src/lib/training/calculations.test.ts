import { describe, expect, it } from "vitest";
import { buildTrainingProgress, calculateWorkoutTotals, estimateOneRepMax } from "./calculations";
import type { WorkoutSession } from "@/types/training";

describe("cálculos de treino", () => {
  it("calcula volume, séries e repetições", () => {
    expect(calculateWorkoutTotals([{ sets: [{ weightKg: 50, reps: 10 }, { weightKg: 60, reps: 8 }] }]))
      .toEqual({ volumeKg: 980, setsCount: 2, repsCount: 18 });
  });

  it("estima 1RM apenas para séries comparáveis", () => {
    expect(estimateOneRepMax(100, 6)).toBe(120);
    expect(estimateOneRepMax(100, 15)).toBe(0);
    expect(estimateOneRepMax(0, 8)).toBe(0);
  });

  it("constrói evolução por exercício e semana", () => {
    const sessions: WorkoutSession[] = [
      { id: "1", planId: null, name: "A", performedAt: "2026-10-05T12:00:00-03:00", notes: null, volumeKg: 1000, setsCount: 2, repsCount: 20, exercises: [{ exerciseId: "e1", exerciseName: "Supino", muscleGroup: "chest", equipment: "Barra", sets: [{ weightKg: 50, reps: 10 }, { weightKg: 50, reps: 10 }] }] },
      { id: "2", planId: null, name: "A", performedAt: "2026-10-12T12:00:00-03:00", notes: null, volumeKg: 1200, setsCount: 2, repsCount: 20, exercises: [{ exerciseId: "e1", exerciseName: "Supino", muscleGroup: "chest", equipment: "Barra", sets: [{ weightKg: 60, reps: 10 }, { weightKg: 60, reps: 10 }] }] },
    ];
    const progress = buildTrainingProgress(sessions);
    expect(progress.totalWorkouts).toBe(2);
    expect(progress.activeWeeks).toBe(2);
    expect(progress.exerciseProgress[0]).toMatchObject({ latestWeightKg: 60, previousWeightKg: 50, changePercent: 20 });
  });
});

