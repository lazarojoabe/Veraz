import { NextResponse } from "next/server";
import { demoDashboard } from "@/data/dashboard";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getDashboardData } from "@/repositories/dashboard.repository";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json(demoDashboard);
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  try {
    return NextResponse.json(await getDashboardData(userId));
  } catch {
    return NextResponse.json({ error: "dashboard_unavailable" }, { status: 500 });
  }
}
