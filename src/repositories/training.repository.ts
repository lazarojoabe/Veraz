import { createClient } from "@/lib/supabase/server";
import type { z } from "zod";
import type { customExerciseSchema, workoutPlanSchema, workoutSessionSchema } from "@/lib/validations/training";
import type { Exercise, MuscleGroup, WorkoutPlan, WorkoutSession } from "@/types/training";

type CustomExerciseInput = z.infer<typeof customExerciseSchema>;
type WorkoutPlanInput = z.infer<typeof workoutPlanSchema>;
type WorkoutSessionInput = z.infer<typeof workoutSessionSchema>;

export async function listExercises(): Promise<Exercise[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("id,name,muscle_group,equipment,tracking_type,user_id")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error("Não foi possível carregar os exercícios.");

  return (data as Array<{ id: string; name: string; muscle_group: MuscleGroup; equipment: string | null; tracking_type: Exercise["trackingType"]; user_id: string | null }>).map((row) => ({
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    equipment: row.equipment,
    trackingType: row.tracking_type,
    isCustom: Boolean(row.user_id),
  }));
}

export async function createCustomExercise(userId: string, input: CustomExerciseInput): Promise<Exercise> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .insert({
      user_id: userId,
      name: input.name,
      muscle_group: input.muscleGroup,
      equipment: input.equipment,
      tracking_type: input.trackingType,
      source: "custom",
    })
    .select("id,name,muscle_group,equipment,tracking_type")
    .single();
  if (error) throw new Error("Não foi possível cadastrar o exercício.");

  return {
    id: data.id as string,
    name: data.name as string,
    muscleGroup: data.muscle_group as MuscleGroup,
    equipment: data.equipment as string | null,
    trackingType: data.tracking_type as Exercise["trackingType"],
    isCustom: true,
  };
}

type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  workout_plan_exercises: Array<{
    position: number;
    target_sets: number;
    target_reps: number;
    rest_seconds: number | null;
    exercises: { id: string; name: string; muscle_group: MuscleGroup; equipment: string | null } | null;
  }>;
};

export async function listWorkoutPlans(userId: string): Promise<WorkoutPlan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_plans")
    .select("id,name,description,created_at,workout_plan_exercises(position,target_sets,target_reps,rest_seconds,exercises(id,name,muscle_group,equipment))")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar as fichas.");

  return (data as unknown as PlanRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    exercises: row.workout_plan_exercises
      .flatMap((item) => item.exercises ? [{
        exerciseId: item.exercises.id,
        exerciseName: item.exercises.name,
        muscleGroup: item.exercises.muscle_group,
        equipment: item.exercises.equipment,
        targetSets: item.target_sets,
        targetReps: item.target_reps,
        restSeconds: item.rest_seconds ?? 90,
        position: item.position,
      }] : [])
      .sort((a, b) => a.position - b.position),
  }));
}

export async function createWorkoutPlan(input: WorkoutPlanInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_workout_plan_with_exercises", {
    p_name: input.name,
    p_description: input.description,
    p_exercises: input.exercises,
  });
  if (error) throw new Error("Não foi possível criar a ficha.");
  return data as string;
}

type SessionRow = {
  id: string;
  plan_id: string | null;
  name: string;
  performed_at: string;
  notes: string | null;
  volume_kg: number | string;
  sets_count: number;
  reps_count: number;
  workout_session_exercises: Array<{
    position: number;
    exercise_id: string | null;
    exercise_name: string;
    muscle_group: MuscleGroup;
    equipment: string | null;
    workout_sets: Array<{ set_number: number; weight_kg: number | string; reps: number }>;
  }>;
};

export async function listWorkoutSessions(userId: string, since?: string): Promise<WorkoutSession[]> {
  const supabase = await createClient();
  let request = supabase
    .from("workout_sessions")
    .select("id,plan_id,name,performed_at,notes,volume_kg,sets_count,reps_count,workout_session_exercises(position,exercise_id,exercise_name,muscle_group,equipment,workout_sets(set_number,weight_kg,reps))")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("performed_at", { ascending: false });
  if (since) request = request.gte("performed_at", since);
  const { data, error } = await request.limit(250);
  if (error) throw new Error("Não foi possível carregar os treinos.");

  return (data as unknown as SessionRow[]).map((row) => ({
    id: row.id,
    planId: row.plan_id,
    name: row.name,
    performedAt: row.performed_at,
    notes: row.notes,
    volumeKg: Number(row.volume_kg),
    setsCount: row.sets_count,
    repsCount: row.reps_count,
    exercises: [...row.workout_session_exercises]
      .sort((a, b) => a.position - b.position)
      .map((exercise) => ({
        exerciseId: exercise.exercise_id ?? `${row.id}-${exercise.position}`,
        exerciseName: exercise.exercise_name,
        muscleGroup: exercise.muscle_group,
        equipment: exercise.equipment,
        sets: [...exercise.workout_sets]
          .sort((a, b) => a.set_number - b.set_number)
          .map((set) => ({ weightKg: Number(set.weight_kg), reps: set.reps })),
      })),
  }));
}

export async function createWorkoutSession(input: WorkoutSessionInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_workout_session_with_sets", {
    p_plan_id: input.planId,
    p_name: input.name,
    p_performed_at: input.performedAt,
    p_notes: input.notes,
    p_exercises: input.exercises,
  });
  if (error) throw new Error("Não foi possível registrar o treino.");
  return data as string;
}

