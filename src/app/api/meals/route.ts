import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mealCreationSchema } from "@/lib/validations/nutrition";
import { historyPeriodSchema } from "@/lib/validations/nutrition";
import { appDayKeyOffset, startOfAppDayIso } from "@/lib/dates/app-timezone";
import { createMeal, createVoiceMeal, listMeals } from "@/repositories/meals.repository";

export async function GET(request: NextRequest) {
  const period = historyPeriodSchema.safeParse(request.nextUrl.searchParams.get("period") ?? "7");
  if (!period.success) return NextResponse.json({ error: "invalid_history_period" }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ meals: [], mode: "demo" });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  try {
    const since = startOfAppDayIso(appDayKeyOffset(-(period.data - 1)));
    return NextResponse.json({ meals: await listMeals(userId, { limit: 500, since }), mode: "connected" });
  } catch {
    return NextResponse.json({ error: "history_unavailable" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "configuration_required", message: "Conecte o Supabase para persistir esta refeição." },
      { status: 503 },
    );
  }

  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const parsed = mealCreationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_meal", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const id = parsed.data.source === "voice" ? await createVoiceMeal(parsed.data) : await createMeal(parsed.data);
    return NextResponse.json({ id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "meal_save_failed" }, { status: 500 });
  }
}
