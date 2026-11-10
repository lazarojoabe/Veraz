import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { coachWorkoutPlanSchema } from "@/lib/validations/coach";
import { createCoachWorkoutPlan } from "@/repositories/coach.repository";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  if (!(await getServerUserId())) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const parsed = coachWorkoutPlanSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_workout_plan" }, { status: 400 });
  try { return NextResponse.json({ id: await createCoachWorkoutPlan(parsed.data) }, { status: 201 }); }
  catch { return NextResponse.json({ error: "coach_plan_save_failed" }, { status: 400 }); }
}
