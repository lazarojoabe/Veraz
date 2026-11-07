import { createClient } from "@/lib/supabase/server";

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

export async function startTranscription(userId: string, hash: string, durationSeconds: number, audioBytes: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audio_transcriptions")
    .upsert(
      { user_id: userId, request_hash: hash, status: "processing", duration_seconds: durationSeconds, audio_bytes: audioBytes, error_code: null },
      { onConflict: "user_id,request_hash" },
    )
    .select("id")
    .single();
  if (error) throw new Error("transcription_audit_failed");
  return data.id as string;
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
