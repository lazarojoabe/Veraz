import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { weightLogSchema } from "@/lib/validations/coach";
import { getClientProgress, saveWeightLog, uploadProgressPhoto } from "@/repositories/coach.repository";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  try { return NextResponse.json(await getClientProgress(userId)); }
  catch { return NextResponse.json({ error: "progress_unavailable" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("photo");
      const label = String(form.get("label") ?? "").trim() || null;
      const takenAt = String(form.get("takenAt") ?? "");
      if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024 || !/^\d{4}-\d{2}-\d{2}$/.test(takenAt)) return NextResponse.json({ error: "invalid_photo" }, { status: 400 });
      return NextResponse.json({ photo: await uploadProgressPhoto(userId, file, label, takenAt) }, { status: 201 });
    }
    const parsed = weightLogSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid_weight_log" }, { status: 400 });
    return NextResponse.json({ weight: await saveWeightLog(userId, parsed.data) }, { status: 201 });
  } catch { return NextResponse.json({ error: "progress_save_failed" }, { status: 500 }); }
}
