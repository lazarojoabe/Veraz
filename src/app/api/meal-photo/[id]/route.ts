import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mealPhotoConfirmationSchema } from "@/lib/validations/meal-photo";
import { confirmMealPhotoAnalysis } from "@/repositories/meal-photo.repository";

export async function PATCH(request: NextRequest, context: RouteContext<"/api/meal-photo/[id]">) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const { id } = await context.params;
  const parsedId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!parsedId) return NextResponse.json({ error: "invalid_analysis_id" }, { status: 400 });
  const parsed = mealPhotoConfirmationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_confirmation", issues: parsed.error.flatten() }, { status: 400 });

  try {
    await confirmMealPhotoAnalysis(userId, id, parsed.data);
    return NextResponse.json({ confirmed: true });
  } catch {
    return NextResponse.json({ error: "confirmation_failed" }, { status: 500 });
  }
}

