import { NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getClientProgress } from "@/repositories/coach.repository";

export async function GET(_request: Request, context: { params: Promise<{ clientId: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  if (!(await getServerUserId())) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const { clientId } = await context.params;
  try { return NextResponse.json(await getClientProgress(clientId)); }
  catch { return NextResponse.json({ error: "client_unavailable" }, { status: 404 }); }
}
