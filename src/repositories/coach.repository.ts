import { createClient } from "@/lib/supabase/server";
import { listExercises, listWorkoutPlans, listWorkoutSessions } from "@/repositories/training.repository";
import type { CoachCatalog, CoachClient, CoachProfile, ClientProgress, NutritionPrescription, ProgressPhoto, WeightLog } from "@/types/coach";
import type { z } from "zod";
import type { accountRoleSchema, coachWorkoutPlanSchema, nutritionPrescriptionSchema, weightLogSchema } from "@/lib/validations/coach";

type WeightInput = z.infer<typeof weightLogSchema>;
type PrescriptionInput = z.infer<typeof nutritionPrescriptionSchema>;
type CoachPlanInput = z.infer<typeof coachWorkoutPlanSchema>;

function toPrescription(row: Record<string, unknown>): NutritionPrescription {
  return {
    id: row.id as string,
    title: row.title as string,
    calories: Number(row.calories),
    proteinG: Number(row.protein_g),
    carbohydratesG: Number(row.carbohydrates_g),
    fatG: Number(row.fat_g),
    instructions: row.instructions as string | null,
    createdAt: row.created_at as string,
    ...(row.coach_name ? { coachName: row.coach_name as string } : {}),
  };
}

export async function getCoachProfile(userId: string): Promise<CoachProfile> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id,display_name,role,invite_code").eq("id", userId).single();
  if (error || !data) throw new Error("profile_unavailable");
  return { id: data.id, displayName: data.display_name, role: data.role as CoachProfile["role"], inviteCode: data.invite_code };
}

export async function setAccountRole(userId: string, role: z.infer<typeof accountRoleSchema>["role"]) {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error("profile_role_save_failed");
}

export async function listCoachClients(): Promise<CoachClient[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_clients")
    .select("created_at,profiles!coach_clients_client_id_fkey(id,display_name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error("clients_unavailable");
  const rows = data as unknown as Array<{ created_at: string; profiles: { id: string; display_name: string } | null }>;
  const clientIds = rows.flatMap((row) => row.profiles ? [row.profiles.id] : []);
  const { data: weights, error: weightsError } = clientIds.length ? await supabase.from("weight_logs").select("user_id,weight_kg,recorded_at").in("user_id", clientIds) : { data: [], error: null };
  if (weightsError) throw new Error("clients_unavailable");
  const newestWeight = new Map<string, { weight_kg: number | string; recorded_at: string }>();
  for (const weight of weights as Array<{ user_id: string; weight_kg: number | string; recorded_at: string }>) {
    const current = newestWeight.get(weight.user_id);
    if (!current || weight.recorded_at > current.recorded_at) newestWeight.set(weight.user_id, weight);
  }
  return rows.flatMap((row) => {
    if (!row.profiles) return [];
    const weight = newestWeight.get(row.profiles.id);
    return [{ id: row.profiles.id, displayName: row.profiles.display_name, connectedAt: row.created_at, latestWeight: weight ? Number(weight.weight_kg) : null, lastCheckIn: weight?.recorded_at ?? null }];
  });
}

export async function getCoachCatalog(userId: string): Promise<CoachCatalog> {
  const [profile, clients, exercises] = await Promise.all([getCoachProfile(userId), listCoachClients(), listExercises()]);
  return { profile, clients, exercises };
}

export async function connectClient(inviteCode: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("connect_coach_by_invite", { p_invite_code: inviteCode });
  if (error) throw new Error(error.code === "P0002" ? "invite_code_not_found" : "client_connection_failed");
}

export async function saveWeightLog(userId: string, input: WeightInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("weight_logs").upsert({ user_id: userId, weight_kg: input.weightKg, recorded_at: input.recordedAt, note: input.note ?? null }, { onConflict: "user_id,recorded_at" }).select("id,weight_kg,recorded_at,note").single();
  if (error) throw new Error("weight_log_save_failed");
  return { id: data.id, weightKg: Number(data.weight_kg), recordedAt: data.recorded_at, note: data.note } satisfies WeightLog;
}

export async function listWeights(userId: string): Promise<WeightLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("weight_logs").select("id,weight_kg,recorded_at,note").eq("user_id", userId).order("recorded_at", { ascending: false }).limit(120);
  if (error) throw new Error("weights_unavailable");
  return data.map((row) => ({ id: row.id, weightKg: Number(row.weight_kg), recordedAt: row.recorded_at, note: row.note }));
}

export async function listProgressPhotos(userId: string): Promise<ProgressPhoto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("progress_photos").select("id,label,taken_at,storage_path").eq("user_id", userId).order("taken_at", { ascending: false }).limit(80);
  if (error) throw new Error("photos_unavailable");
  return Promise.all(data.map(async (row) => {
    const { data: signed } = await supabase.storage.from("progress-photos").createSignedUrl(row.storage_path, 60 * 30);
    return { id: row.id, label: row.label, takenAt: row.taken_at, url: signed?.signedUrl ?? null };
  }));
}

export async function uploadProgressPhoto(userId: string, file: File, label: string | null, takenAt: string) {
  const supabase = await createClient();
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("progress-photos").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error("photo_upload_failed");
  const { data, error } = await supabase.from("progress_photos").insert({ user_id: userId, storage_path: path, label, taken_at: takenAt }).select("id,label,taken_at").single();
  if (error) {
    await supabase.storage.from("progress-photos").remove([path]);
    throw new Error("photo_save_failed");
  }
  const { data: signed } = await supabase.storage.from("progress-photos").createSignedUrl(path, 60 * 30);
  return { id: data.id, label: data.label, takenAt: data.taken_at, url: signed?.signedUrl ?? null } satisfies ProgressPhoto;
}

export async function listPrescriptions(userId: string): Promise<NutritionPrescription[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("nutrition_prescriptions").select("id,title,calories,protein_g,carbohydrates_g,fat_g,instructions,created_at").eq("client_id", userId).eq("is_active", true).order("created_at", { ascending: false });
  if (error) throw new Error("prescriptions_unavailable");
  return data.map((row) => toPrescription(row));
}

export async function createNutritionPrescription(input: PrescriptionInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("nutrition_prescriptions").insert({ coach_id: (await supabase.auth.getClaims()).data?.claims?.sub, client_id: input.clientId, title: input.title, calories: input.calories, protein_g: input.proteinG, carbohydrates_g: input.carbohydratesG, fat_g: input.fatG, instructions: input.instructions ?? null });
  if (error) throw new Error("prescription_save_failed");
}

export async function createCoachWorkoutPlan(input: CoachPlanInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_coach_workout_plan_with_exercises", { p_client_id: input.clientId, p_name: input.name, p_description: input.description ?? "", p_exercises: input.exercises });
  if (error) throw new Error("coach_plan_save_failed");
  return data as string;
}

export async function getClientProgress(clientId: string): Promise<ClientProgress> {
  const supabase = await createClient();
  const [{ data: profile, error: profileError }, weights, photos, prescriptions, plans, sessions] = await Promise.all([
    supabase.from("profiles").select("id,display_name").eq("id", clientId).single(),
    listWeights(clientId), listProgressPhotos(clientId), listPrescriptions(clientId), listWorkoutPlans(clientId), listWorkoutSessions(clientId),
  ]);
  if (profileError || !profile) throw new Error("client_unavailable");
  return { client: { id: profile.id, displayName: profile.display_name }, weights, photos, prescriptions, plans, sessions };
}
