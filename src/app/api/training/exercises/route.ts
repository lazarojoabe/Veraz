import { NextRequest, NextResponse } from "next/server";
import { demoExercises } from "@/data/training";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { customExerciseSchema } from "@/lib/validations/training";
import { createCustomExercise, listExercises } from "@/repositories/training.repository";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ exercises: demoExercises, mode: "local" });
  if (!(await getServerUserId())) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  try { return NextResponse.json({ exercises: await listExercises(), mode: "connected" }); }
  catch { return NextResponse.json({ error: "exercises_unavailable" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const parsed = customExerciseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_exercise" }, { status: 400 });
  try { return NextResponse.json({ exercise: await createCustomExercise(userId, parsed.data) }, { status: 201 }); }
  catch { return NextResponse.json({ error: "exercise_save_failed" }, { status: 500 }); }
}

