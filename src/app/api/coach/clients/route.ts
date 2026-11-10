import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { coachInviteSchema } from "@/lib/validations/coach";
import { connectClient, getCoachCatalog } from "@/repositories/coach.repository";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  try {
    const catalog = await getCoachCatalog(userId);
    if (catalog.profile.role !== "coach") return NextResponse.json({ error: "coach_role_required" }, { status: 403 });
    return NextResponse.json(catalog);
  } catch { return NextResponse.json({ error: "clients_unavailable" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  if (!(await getServerUserId())) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const parsed = coachInviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_invite_code" }, { status: 400 });
  try { await connectClient(parsed.data.inviteCode); return NextResponse.json({}, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "client_connection_failed" }, { status: 400 }); }
}
