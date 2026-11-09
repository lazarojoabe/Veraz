import { NextRequest, NextResponse } from "next/server";
import { demoSessions } from "@/data/training";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { trainingPeriodSchema, workoutSessionSchema } from "@/lib/validations/training";
import { createWorkoutSession, listWorkoutSessions } from "@/repositories/training.repository";

export async function GET(request: NextRequest) {
  const parsedPeriod = trainingPeriodSchema.safeParse(request.nextUrl.searchParams.get("period") ?? "90");
  if (!parsedPeriod.success) return NextResponse.json({ error: "invalid_period" }, { status: 400 });
  const since = new Date(Date.now() - parsedPeriod.data * 86_400_000).toISOString();
  if (!isSupabaseConfigured()) return NextResponse.json({ sessions: demoSessions.filter((session) => session.performedAt >= since), mode: "local" });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  try { return NextResponse.json({ sessions: await listWorkoutSessions(userId, since), mode: "connected" }); }
  catch { return NextResponse.json({ error: "sessions_unavailable" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  if (!(await getServerUserId())) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const parsed = workoutSessionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_workout_session" }, { status: 400 });
  try { return NextResponse.json({ id: await createWorkoutSession(parsed.data) }, { status: 201 }); }
  catch { return NextResponse.json({ error: "session_save_failed" }, { status: 500 }); }
}

