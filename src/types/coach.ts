import type { Exercise, WorkoutPlan, WorkoutSession } from "@/types/training";

export type AccountRole = "athlete" | "coach";

export type CoachProfile = {
  id: string;
  displayName: string;
  role: AccountRole;
  inviteCode: string;
};

export type CoachClient = {
  id: string;
  displayName: string;
  connectedAt: string;
  latestWeight: number | null;
  lastCheckIn: string | null;
};

export type NutritionPrescription = {
  id: string;
  title: string;
  calories: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
  instructions: string | null;
  createdAt: string;
  coachName?: string;
};

export type WeightLog = { id: string; weightKg: number; recordedAt: string; note: string | null };
export type ProgressPhoto = { id: string; label: string | null; takenAt: string; url: string | null };

export type ClientProgress = {
  client: { id: string; displayName: string };
  weights: WeightLog[];
  photos: ProgressPhoto[];
  prescriptions: NutritionPrescription[];
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
};

export type CoachCatalog = { profile: CoachProfile; clients: CoachClient[]; exercises: Exercise[] };
