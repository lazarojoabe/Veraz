import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { instantiateTemplate } from "@/repositories/templates.repository";

export async function POST(_: NextRequest, { params }: RouteContext<"/api/templates/[id]/use">) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  if (!(await getServerUserId())) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "invalid_template_id" }, { status: 400 });
  try { return NextResponse.json({ mealId: await instantiateTemplate(id) }, { status: 201 }); }
  catch { return NextResponse.json({ error: "template_use_failed" }, { status: 500 }); }
}
