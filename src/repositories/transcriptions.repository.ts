import { createClient } from "@/lib/supabase/server";
import type { TranscriptionUsage } from "@/types/transcription";

type UsageRow = {
  status: "pending" | "processing" | "completed" | "failed";
  duration_seconds: number | string | null;
  audio_bytes: number | string | null;
  estimated_cost_usd: number | string | null;
};

export function summarizeTranscriptionUsage(rows: UsageRow[], periodDays: number): TranscriptionUsage {
  return rows.reduce<TranscriptionUsage>((summary, row) => ({
    ...summary,
    completed: summary.completed + (row.status === "completed" ? 1 : 0),
    failed: summary.failed + (row.status === "failed" ? 1 : 0),
    durationSeconds: summary.durationSeconds + Number(row.duration_seconds ?? 0),
    audioBytes: summary.audioBytes + Number(row.audio_bytes ?? 0),
    estimatedCostUsd: summary.estimatedCostUsd + Number(row.estimated_cost_usd ?? 0),
  }), {
    periodDays,
    requests: rows.length,
    completed: 0,
    failed: 0,
    durationSeconds: 0,
    audioBytes: 0,
    estimatedCostUsd: 0,
  });
}

export async function getTranscriptionUsage(userId: string, since: string, periodDays = 30) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audio_transcriptions")
    .select("status,duration_seconds,audio_bytes,estimated_cost_usd")
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) throw new Error("transcription_usage_failed");
  return summarizeTranscriptionUsage((data ?? []) as UsageRow[], periodDays);
}

export async function canStartTranscription(userId: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("audio_transcriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) throw new Error("transcription_rate_check_failed");
  return (count ?? 0) < 5;
}

export async function findCompletedTranscription(userId: string, hash: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audio_transcriptions")
    .select("id,transcript,structured_items")
    .eq("user_id", userId)
    .eq("request_hash", hash)
    .eq("status", "completed")
    .maybeSingle();
  return data as { id: string; transcript: string; structured_items: unknown } | null;
}

export async function claimTranscription(userId: string, hash: string, durationSeconds: number, audioBytes: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audio_transcriptions")
    .insert({ user_id: userId, request_hash: hash, status: "processing", duration_seconds: durationSeconds, audio_bytes: audioBytes, error_code: null })
    .select("id")
    .single();
  if (!error) return { id: data.id as string, claimed: true as const, status: "processing" as const };
  if (error.code !== "23505") throw new Error("transcription_audit_failed");

  const { data: existing, error: existingError } = await supabase
    .from("audio_transcriptions")
    .select("id,status,transcript,structured_items")
    .eq("user_id", userId)
    .eq("request_hash", hash)
    .single();
  if (existingError) throw new Error("transcription_audit_failed");

  if (existing.status === "failed") {
    const { data: retried, error: retryError } = await supabase
      .from("audio_transcriptions")
      .update({ status: "processing", duration_seconds: durationSeconds, audio_bytes: audioBytes, error_code: null, audio_discarded_at: null })
      .eq("id", existing.id)
      .eq("status", "failed")
      .select("id")
      .maybeSingle();
    if (retryError) throw new Error("transcription_audit_failed");
    if (retried) return { id: retried.id as string, claimed: true as const, status: "processing" as const };
  }

  return {
    id: existing.id as string,
    claimed: false as const,
    status: existing.status as "pending" | "processing" | "completed" | "failed",
    transcript: existing.transcript as string | null,
    structuredItems: existing.structured_items as unknown,
  };
}

export async function completeTranscription(id: string, transcript: string, structuredItems: unknown, durationSeconds: number) {
  const supabase = await createClient();
  const hourlyRate = Number(process.env.ELEVENLABS_SCRIBE_USD_PER_HOUR ?? "0.22");
  const { error } = await supabase
    .from("audio_transcriptions")
    .update({
      status: "completed",
      transcript,
      structured_items: structuredItems,
      estimated_cost_usd: Number(((durationSeconds / 3600) * hourlyRate).toFixed(6)),
      audio_discarded_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error("transcription_audit_failed");
}

export async function failTranscription(id: string, code: string) {
  const supabase = await createClient();
  await supabase
    .from("audio_transcriptions")
    .update({ status: "failed", error_code: code.slice(0, 80), audio_discarded_at: new Date().toISOString() })
    .eq("id", id);
}
