import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createCustomFood, searchFoods, suggestFoodForCatalog } from "@/repositories/foods.repository";
import { customFoodSchema } from "@/lib/validations/nutrition";

export async function GET(request: NextRequest) {
  const configured = isSupabaseConfigured();
  if (configured && !(await getServerUserId())) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  try {
    const foods = await searchFoods(request.nextUrl.searchParams.get("q") ?? "");
    return NextResponse.json({ foods, mode: configured ? "connected" : "demo" });
  } catch {
    return NextResponse.json({ error: "catalog_unavailable" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "configuration_required", message: "Conecte o Supabase para criar alimentos." }, { status: 503 });
  }
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const parsed = customFoodSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_food", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const food = await createCustomFood(userId, parsed.data);
    if (parsed.data.suggestForCatalog) await suggestFoodForCatalog(userId, food.id, parsed.data.sourceUrl);
    return NextResponse.json({ food, suggested: parsed.data.suggestForCatalog }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "food_save_failed" }, { status: 500 });
  }
}
