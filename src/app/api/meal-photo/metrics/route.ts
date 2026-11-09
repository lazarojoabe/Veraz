import { NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listMealPhotoEvaluations } from "@/repositories/meal-photo.repository";
import { calculateMealPhotoMetrics } from "@/services/meal-photo/evaluation";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  try {
    return NextResponse.json({ metrics: calculateMealPhotoMetrics(await listMealPhotoEvaluations(userId)) });
  } catch {
    return NextResponse.json({ error: "photo_metrics_unavailable" }, { status: 500 });
  }
}

