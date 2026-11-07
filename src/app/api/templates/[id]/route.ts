import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { deleteTemplate } from "@/repositories/templates.repository";

export async function DELETE(_: NextRequest, { params }: RouteContext<"/api/templates/[id]">) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "invalid_template_id" }, { status: 400 });
  try { await deleteTemplate(userId, id); return new NextResponse(null, { status: 204 }); }
  catch { return NextResponse.json({ error: "template_delete_failed" }, { status: 500 }); }
}
