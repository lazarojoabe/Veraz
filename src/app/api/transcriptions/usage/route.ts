import { NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { appDayKeyOffset, startOfAppDayIso } from "@/lib/dates/app-timezone";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getTranscriptionUsage } from "@/repositories/transcriptions.repository";
import type { TranscriptionUsage } from "@/types/transcription";

const emptyUsage: TranscriptionUsage = {
  periodDays: 30,
  requests: 0,
  completed: 0,
  failed: 0,
  durationSeconds: 0,
  audioBytes: 0,
  estimatedCostUsd: 0,
};

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ usage: emptyUsage, mode: "demo" });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  try {
    const since = startOfAppDayIso(appDayKeyOffset(-29));
    return NextResponse.json({ usage: await getTranscriptionUsage(userId, since), mode: "connected" });
  } catch {
    return NextResponse.json({ error: "transcription_usage_unavailable" }, { status: 500 });
  }
}
