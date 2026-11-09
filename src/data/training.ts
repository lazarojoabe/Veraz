import { calculateWorkoutTotals } from "@/lib/training/calculations";
import type { Exercise, WorkoutPlan, WorkoutSession } from "@/types/training";

export const demoExercises: Exercise[] = [
  { id: "20000000-0000-4000-8000-000000000001", name: "Supino reto", muscleGroup: "chest", equipment: "Barra", trackingType: "weight_reps", isCustom: false },
  { id: "20000000-0000-4000-8000-000000000002", name: "Supino inclinado com halteres", muscleGroup: "chest", equipment: "Halteres", trackingType: "weight_reps", isCustom: false },
  { id: "20000000-0000-4000-8000-000000000003", name: "Puxada frontal", muscleGroup: "back", equipment: "Polia", trackingType: "weight_reps", isCustom: false },
  { id: "20000000-0000-4000-8000-000000000004", name: "Remada baixa", muscleGroup: "back", equipment: "Polia", trackingType: "weight_reps", isCustom: false },
  { id: "20000000-0000-4000-8000-000000000005", name: "Agachamento livre", muscleGroup: "legs", equipment: "Barra", trackingType: "weight_reps", isCustom: false },
  { id: "20000000-0000-4000-8000-000000000006", name: "Leg press 45°", muscleGroup: "legs", equipment: "Máquina", trackingType: "weight_reps", isCustom: false },
  { id: "20000000-0000-4000-8000-000000000008", name: "Levantamento terra romeno", muscleGroup: "glutes", equipment: "Barra", trackingType: "weight_reps", isCustom: false },
  { id: "20000000-0000-4000-8000-000000000009", name: "Desenvolvimento com halteres", muscleGroup: "shoulders", equipment: "Halteres", trackingType: "weight_reps", isCustom: false },
  { id: "20000000-0000-4000-8000-000000000010", name: "Elevação lateral", muscleGroup: "shoulders", equipment: "Halteres", trackingType: "weight_reps", isCustom: false },
  { id: "20000000-0000-4000-8000-000000000011", name: "Rosca direta", muscleGroup: "arms", equipment: "Barra", trackingType: "weight_reps", isCustom: false },
  { id: "20000000-0000-4000-8000-000000000012", name: "Tríceps na polia", muscleGroup: "arms", equipment: "Polia", trackingType: "weight_reps", isCustom: false },
  { id: "20000000-0000-4000-8000-000000000014", name: "Flexão de braços", muscleGroup: "chest", equipment: "Peso corporal", trackingType: "bodyweight_reps", isCustom: false },
];

export const demoPlans: WorkoutPlan[] = [
  {
    id: "demo-plan-a",
    name: "Treino A · Superiores",
    description: "Peito, costas e ombros",
    createdAt: "2026-09-28T12:00:00-03:00",
    exercises: [
      { exerciseId: demoExercises[0].id, exerciseName: demoExercises[0].name, muscleGroup: "chest", equipment: "Barra", targetSets: 4, targetReps: 8, restSeconds: 90, position: 0 },
      { exerciseId: demoExercises[2].id, exerciseName: demoExercises[2].name, muscleGroup: "back", equipment: "Polia", targetSets: 4, targetReps: 10, restSeconds: 90, position: 1 },
      { exerciseId: demoExercises[7].id, exerciseName: demoExercises[7].name, muscleGroup: "shoulders", equipment: "Halteres", targetSets: 3, targetReps: 10, restSeconds: 75, position: 2 },
    ],
  },
  {
    id: "demo-plan-b",
    name: "Treino B · Inferiores",
    description: "Pernas e glúteos",
    createdAt: "2026-09-28T12:00:00-03:00",
    exercises: [
      { exerciseId: demoExercises[4].id, exerciseName: demoExercises[4].name, muscleGroup: "legs", equipment: "Barra", targetSets: 4, targetReps: 8, restSeconds: 120, position: 0 },
      { exerciseId: demoExercises[5].id, exerciseName: demoExercises[5].name, muscleGroup: "legs", equipment: "Máquina", targetSets: 4, targetReps: 12, restSeconds: 90, position: 1 },
      { exerciseId: demoExercises[6].id, exerciseName: demoExercises[6].name, muscleGroup: "glutes", equipment: "Barra", targetSets: 3, targetReps: 10, restSeconds: 90, position: 2 },
    ],
  },
];

function session(id: string, performedAt: string, weights: [number, number, number]): WorkoutSession {
  const exercises = demoPlans[0].exercises.map((exercise, index) => ({
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    muscleGroup: exercise.muscleGroup,
    equipment: exercise.equipment,
    sets: Array.from({ length: index === 2 ? 3 : 4 }, () => ({ weightKg: weights[index], reps: exercise.targetReps })),
  }));
  return { id, planId: demoPlans[0].id, name: demoPlans[0].name, performedAt, notes: null, ...calculateWorkoutTotals(exercises), exercises };
}

export const demoSessions: WorkoutSession[] = [
  session("demo-session-1", "2026-10-12T18:30:00-03:00", [52.5, 48, 16]),
  session("demo-session-2", "2026-10-26T18:20:00-03:00", [55, 50, 18]),
  session("demo-session-3", "2026-11-06T18:10:00-03:00", [60, 54, 20]),
];

