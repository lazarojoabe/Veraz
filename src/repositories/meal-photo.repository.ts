import { createClient } from "@/lib/supabase/server";
import type { MealPhotoConfirmation } from "@/lib/validations/meal-photo";
import type { MealPhotoEvaluationRow, MealPhotoModelAnalysis, ResolvedMealPhotoItem } from "@/types/meal-photo";

export async function canStartMealPhotoAnalysis(userId: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("meal_photo_analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) throw new Error("photo_analysis_rate_unavailable");
  return (count ?? 0) < 10;
}

export async function createMealPhotoAnalysis(input: {
  userId: string;
  model: string;
  providerRequestId: string | null;
  imageSha256: string;
  imageMimeType: string;
  imageBytes: number;
  plateDiameterCm: number | null;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  rawAnalysis: MealPhotoModelAnalysis;
  predictedItems: ResolvedMealPhotoItem[];
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meal_photo_analyses")
    .insert({
      user_id: input.userId,
      model: input.model,
      provider_request_id: input.providerRequestId,
      image_sha256: input.imageSha256,
      image_mime_type: input.imageMimeType,
      image_bytes: input.imageBytes,
      plate_diameter_cm: input.plateDiameterCm,
      latency_ms: input.latencyMs,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      raw_analysis: input.rawAnalysis,
      predicted_items: input.predictedItems,
      status: "completed",
    })
    .select("id")
    .single();
  if (error) throw new Error("photo_analysis_audit_failed");
  return data.id as string;
}

export async function confirmMealPhotoAnalysis(userId: string, analysisId: string, input: MealPhotoConfirmation) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meal_photo_analyses")
    .update({
      meal_id: input.mealId,
      confirmed_items: input.items,
      measurement_method: input.measurementMethod,
      review_duration_ms: input.reviewDurationMs,
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", analysisId)
    .eq("user_id", userId)
    .eq("status", "completed")
    .select("id")
    .single();
  if (error || !data) throw new Error("photo_analysis_confirmation_failed");
}

export async function listMealPhotoEvaluations(userId: string, limit = 500): Promise<MealPhotoEvaluationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meal_photo_analyses")
    .select("predicted_items,raw_analysis,confirmed_items,measurement_method,review_duration_ms,status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("photo_metrics_unavailable");
  return (data ?? []).map((row) => ({
    predictedItems: row.predicted_items as ResolvedMealPhotoItem[],
    rawAnalysis: row.raw_analysis as MealPhotoModelAnalysis,
    confirmedItems: row.confirmed_items as MealPhotoEvaluationRow["confirmedItems"],
    measurementMethod: row.measurement_method as MealPhotoEvaluationRow["measurementMethod"],
    reviewDurationMs: row.review_duration_ms === null ? null : Number(row.review_duration_ms),
    status: row.status as MealPhotoEvaluationRow["status"],
  }));
}

