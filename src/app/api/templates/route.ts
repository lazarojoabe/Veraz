import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mealTemplateSchema } from "@/lib/validations/nutrition";
import { createTemplate, listTemplates } from "@/repositories/templates.repository";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ templates: [], mode: "demo" });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  try { return NextResponse.json({ templates: await listTemplates(userId), mode: "connected" }); }
  catch { return NextResponse.json({ error: "templates_unavailable" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  if (!(await getServerUserId())) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const parsed = mealTemplateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_template" }, { status: 400 });
  try { return NextResponse.json({ id: await createTemplate(parsed.data) }, { status: 201 }); }
  catch { return NextResponse.json({ error: "template_save_failed" }, { status: 500 }); }
}
