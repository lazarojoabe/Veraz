import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { nutritionGoalsSchema } from "@/lib/validations/nutrition";
import { getGoals, saveGoals } from "@/repositories/goals.repository";

const demoGoals = { calories: 2300, proteinG: 150, carbohydratesG: 240, fatG: 70 };

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ goals: demoGoals, mode: "demo" });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  try {
    return NextResponse.json({ goals: await getGoals(userId), mode: "connected" });
  } catch {
    return NextResponse.json({ error: "goals_unavailable" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "configuration_required", message: "Conecte o Supabase para persistir suas metas." },
      { status: 503 },
    );
  }

  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const parsed = nutritionGoalsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_goals" }, { status: 400 });

  try {
    return NextResponse.json({ goals: await saveGoals(userId, parsed.data) });
  } catch {
    return NextResponse.json({ error: "goals_save_failed" }, { status: 500 });
  }
}
