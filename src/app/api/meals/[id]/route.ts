import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { deleteMeal, getMeal, replaceMeal } from "@/repositories/meals.repository";
import { mealInputSchema } from "@/lib/validations/nutrition";
import { getFoodsByIds } from "@/repositories/foods.repository";

export async function GET(_: NextRequest, { params }: RouteContext<"/api/meals/[id]">) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "invalid_meal_id" }, { status: 400 });
  try {
    const meal = await getMeal(userId, id);
    const foods = await getFoodsByIds(meal.items.map((item) => item.foodId));
    return NextResponse.json({ meal, foods });
  } catch {
    return NextResponse.json({ error: "meal_not_found" }, { status: 404 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext<"/api/meals/[id]">) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "invalid_meal_id" }, { status: 400 });
  const parsed = mealInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_meal", issues: parsed.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json({ id: await replaceMeal(userId, id, parsed.data) });
  } catch {
    return NextResponse.json({ error: "meal_update_failed" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: RouteContext<"/api/meals/[id]">) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "invalid_meal_id" }, { status: 400 });

  try {
    await deleteMeal(userId, id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "meal_delete_failed" }, { status: 500 });
  }
}
