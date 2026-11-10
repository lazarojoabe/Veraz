import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { accountRoleSchema } from "@/lib/validations/coach";
import { getCoachProfile, setAccountRole } from "@/repositories/coach.repository";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  try { return NextResponse.json({ profile: await getCoachProfile(userId) }); }
  catch { return NextResponse.json({ error: "profile_unavailable" }, { status: 500 }); }
}

export async function PUT(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const parsed = accountRoleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  try { await setAccountRole(userId, parsed.data.role); return NextResponse.json({ role: parsed.data.role }); }
  catch { return NextResponse.json({ error: "profile_role_save_failed" }, { status: 500 }); }
}
