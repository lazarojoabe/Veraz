import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getFoodsByIds, searchFoods } from "@/repositories/foods.repository";
import {
  completeTranscription,
  canStartTranscription,
  failTranscription,
  findCompletedTranscription,
  startTranscription,
} from "@/repositories/transcriptions.repository";
import { transcribeWithElevenLabs } from "@/services/transcription/elevenlabs";
import { parseMealTranscript, type ParsedTranscriptItem } from "@/services/transcription/parse-meal-transcript";

const acceptedTypes = new Set([
  "audio/aac", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/opus", "audio/wav", "audio/webm", "audio/x-m4a",
]);
const maxBytes = 15 * 1024 * 1024;

type StructuredItems = { items: ParsedTranscriptItem[]; unresolved: string[] };

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "configuration_required", message: "Conecte o Supabase para usar o registro por voz." }, { status: 503 });
  }
  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "transcription_not_configured", message: "Configure a transcrição por voz no servidor." }, { status: 503 });
  }

  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("audio");
  const duration = Number(form?.get("durationSeconds"));
  if (!(file instanceof File) || !acceptedTypes.has(file.type.split(";")[0]) || file.size <= 0 || file.size > maxBytes) {
    return NextResponse.json({ error: "invalid_audio" }, { status: 400 });
  }
  if (!Number.isFinite(duration) || duration <= 0 || duration > 30.5) {
    return NextResponse.json({ error: "invalid_duration" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex");
  const cached = await findCompletedTranscription(userId, hash);
  if (cached) {
    const structured = cached.structured_items as StructuredItems;
    const foods = await getFoodsByIds(structured.items.map((item) => item.foodId));
    return NextResponse.json({ transcript: cached.transcript, ...structured, foods, cached: true });
  }
  if (!(await canStartTranscription(userId))) {
    return NextResponse.json({ error: "rate_limited", message: "Aguarde alguns minutos antes de enviar outro áudio." }, { status: 429 });
  }

  let auditId: string | null = null;
  try {
    auditId = await startTranscription(userId, hash, duration, file.size);
    const transcript = await transcribeWithElevenLabs(new File([bytes], file.name, { type: file.type }));
    const catalog = await searchFoods("");
    const structured = parseMealTranscript(transcript.text, catalog);
    await completeTranscription(auditId, transcript.text, structured, duration);
    const foods = catalog.filter((food) => structured.items.some((item) => item.foodId === food.id));
    return NextResponse.json({ transcript: transcript.text, ...structured, foods, cached: false });
  } catch (error) {
    if (auditId) await failTranscription(auditId, (error as Error).message);
    return NextResponse.json({ error: "transcription_failed", message: "Não foi possível transcrever este áudio. Tente novamente." }, { status: 502 });
  }
}
