import { NextRequest, NextResponse } from "next/server";
import { demoSessions } from "@/data/training";
import { getServerUserId } from "@/lib/auth/server-user";
import { buildTrainingProgress } from "@/lib/training/calculations";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { trainingPeriodSchema } from "@/lib/validations/training";
import { listWorkoutSessions } from "@/repositories/training.repository";

export async function GET(request: NextRequest) {
  const parsedPeriod = trainingPeriodSchema.safeParse(request.nextUrl.searchParams.get("period") ?? "90");
  if (!parsedPeriod.success) return NextResponse.json({ error: "invalid_period" }, { status: 400 });
  const since = new Date(Date.now() - parsedPeriod.data * 86_400_000).toISOString();
  if (!isSupabaseConfigured()) return NextResponse.json({ progress: buildTrainingProgress(demoSessions.filter((session) => session.performedAt >= since)), mode: "local" });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  try { return NextResponse.json({ progress: buildTrainingProgress(await listWorkoutSessions(userId, since)), mode: "connected" }); }
  catch { return NextResponse.json({ error: "progress_unavailable" }, { status: 500 }); }
}

