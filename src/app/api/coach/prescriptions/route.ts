import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { nutritionPrescriptionSchema } from "@/lib/validations/coach";
import { createNutritionPrescription } from "@/repositories/coach.repository";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  if (!(await getServerUserId())) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const parsed = nutritionPrescriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_prescription" }, { status: 400 });
  try { await createNutritionPrescription(parsed.data); return NextResponse.json({}, { status: 201 }); }
  catch { return NextResponse.json({ error: "prescription_save_failed" }, { status: 400 }); }
}
