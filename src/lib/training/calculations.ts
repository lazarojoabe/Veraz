import type { MuscleGroup, TrainingProgress, WorkoutSession, WorkoutSessionExercise } from "@/types/training";
import { muscleGroupLabels } from "@/types/training";

export function estimateOneRepMax(weightKg: number, reps: number) {
  if (weightKg <= 0 || reps < 1 || reps > 10) return 0;
  return weightKg * (1 + reps / 30);
}

export function calculateWorkoutTotals(exercises: Array<Pick<WorkoutSessionExercise, "sets">>) {
  return exercises.reduce((totals, exercise) => {
    for (const set of exercise.sets) {
      totals.volumeKg += set.weightKg * set.reps;
      totals.setsCount += 1;
      totals.repsCount += set.reps;
    }
    return totals;
  }, { volumeKg: 0, setsCount: 0, repsCount: 0 });
}

function startOfIsoWeek(value: Date) {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

export function buildTrainingProgress(sessions: WorkoutSession[]): TrainingProgress {
  const completed = [...sessions].sort((a, b) => Date.parse(a.performedAt) - Date.parse(b.performedAt));
  const weekly = new Map<string, { volumeKg: number; workouts: number }>();
  const exercises = new Map<string, TrainingProgress["exerciseProgress"][number]>();
  const muscleVolumes = new Map<MuscleGroup, number>();

  for (const session of completed) {
    const week = startOfIsoWeek(new Date(session.performedAt));
    const weekValue = weekly.get(week) ?? { volumeKg: 0, workouts: 0 };
    weekValue.volumeKg += session.volumeKg;
    weekValue.workouts += 1;
    weekly.set(week, weekValue);

    for (const exercise of session.exercises) {
      const bestWeightKg = Math.max(...exercise.sets.map((set) => set.weightKg), 0);
      const volumeKg = exercise.sets.reduce((sum, set) => sum + set.weightKg * set.reps, 0);
      const estimated1Rm = Math.max(...exercise.sets.map((set) => estimateOneRepMax(set.weightKg, set.reps)), 0);
      const current = exercises.get(exercise.exerciseId) ?? {
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        latestWeightKg: 0,
        previousWeightKg: null,
        changePercent: null,
        bestEstimated1Rm: 0,
        totalVolumeKg: 0,
        history: [],
      };
      current.history.push({ date: session.performedAt, label: shortDate(session.performedAt), bestWeightKg, volumeKg, estimated1Rm });
      current.totalVolumeKg += volumeKg;
      current.bestEstimated1Rm = Math.max(current.bestEstimated1Rm, estimated1Rm);
      exercises.set(exercise.exerciseId, current);
      muscleVolumes.set(exercise.muscleGroup, (muscleVolumes.get(exercise.muscleGroup) ?? 0) + volumeKg);
    }
  }

  for (const exercise of exercises.values()) {
    const latest = exercise.history.at(-1)?.bestWeightKg ?? 0;
    const previous = exercise.history.at(-2)?.bestWeightKg ?? null;
    exercise.latestWeightKg = latest;
    exercise.previousWeightKg = previous;
    exercise.changePercent = previous && previous > 0 ? ((latest - previous) / previous) * 100 : null;
  }

  return {
    totalWorkouts: completed.length,
    totalVolumeKg: completed.reduce((sum, session) => sum + session.volumeKg, 0),
    totalSets: completed.reduce((sum, session) => sum + session.setsCount, 0),
    activeWeeks: weekly.size,
    weeklyVolume: [...weekly.entries()].map(([week, value]) => ({ week, label: shortDate(`${week}T12:00:00Z`), ...value })),
    exerciseProgress: [...exercises.values()].sort((a, b) => b.totalVolumeKg - a.totalVolumeKg),
    muscleDistribution: [...muscleVolumes.entries()]
      .map(([muscleGroup, volumeKg]) => ({ muscleGroup, label: muscleGroupLabels[muscleGroup], volumeKg }))
      .sort((a, b) => b.volumeKg - a.volumeKg),
  };
}

