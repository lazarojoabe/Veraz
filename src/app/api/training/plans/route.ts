import { NextRequest, NextResponse } from "next/server";
import { demoPlans } from "@/data/training";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { workoutPlanSchema } from "@/lib/validations/training";
import { createWorkoutPlan, listWorkoutPlans } from "@/repositories/training.repository";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ plans: demoPlans, mode: "local" });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  try { return NextResponse.json({ plans: await listWorkoutPlans(userId), mode: "connected" }); }
  catch { return NextResponse.json({ error: "plans_unavailable" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  if (!(await getServerUserId())) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const parsed = workoutPlanSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_workout_plan" }, { status: 400 });
  try { return NextResponse.json({ id: await createWorkoutPlan(parsed.data) }, { status: 201 }); }
  catch { return NextResponse.json({ error: "plan_save_failed" }, { status: 500 }); }
}

