export const muscleGroups = ["chest", "back", "legs", "shoulders", "arms", "core", "glutes", "full_body", "cardio"] as const;
export type MuscleGroup = (typeof muscleGroups)[number];

export const muscleGroupLabels: Record<MuscleGroup, string> = {
  chest: "Peito",
  back: "Costas",
  legs: "Pernas",
  shoulders: "Ombros",
  arms: "Braços",
  core: "Core",
  glutes: "Glúteos",
  full_body: "Corpo inteiro",
  cardio: "Cardio",
};

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string | null;
  trackingType: "weight_reps" | "bodyweight_reps";
  isCustom: boolean;
};

export type WorkoutPlanExercise = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  equipment: string | null;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  position: number;
};

export type WorkoutPlan = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  exercises: WorkoutPlanExercise[];
};

export type WorkoutSet = {
  weightKg: number;
  reps: number;
};

export type WorkoutSessionExercise = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  equipment: string | null;
  sets: WorkoutSet[];
};

export type WorkoutSession = {
  id: string;
  planId: string | null;
  name: string;
  performedAt: string;
  notes: string | null;
  volumeKg: number;
  setsCount: number;
  repsCount: number;
  exercises: WorkoutSessionExercise[];
};

export type TrainingProgress = {
  totalWorkouts: number;
  totalVolumeKg: number;
  totalSets: number;
  activeWeeks: number;
  weeklyVolume: Array<{ week: string; label: string; volumeKg: number; workouts: number }>;
  exerciseProgress: Array<{
    exerciseId: string;
    exerciseName: string;
    latestWeightKg: number;
    previousWeightKg: number | null;
    changePercent: number | null;
    bestEstimated1Rm: number;
    totalVolumeKg: number;
    history: Array<{ date: string; label: string; bestWeightKg: number; volumeKg: number; estimated1Rm: number }>;
  }>;
  muscleDistribution: Array<{ muscleGroup: MuscleGroup; label: string; volumeKg: number }>;
};

