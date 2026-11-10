import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { challengeActionSchema } from "@/lib/validations/challenges";
import { createChallenge, createChallengeGroup, joinChallengeGroup, listChallengeGroups } from "@/repositories/challenges.repository";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ groups: [], mode: "demo" });
  if (!(await getServerUserId())) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  try { return NextResponse.json({ groups: await listChallengeGroups(), mode: "connected" }); }
  catch { return NextResponse.json({ error: "challenges_unavailable" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "configuration_required" }, { status: 503 });
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const parsed = challengeActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_challenge_request" }, { status: 400 });
  try {
    if (parsed.data.action === "create_group") await createChallengeGroup(parsed.data);
    if (parsed.data.action === "join_group") await joinChallengeGroup(parsed.data);
    if (parsed.data.action === "create_challenge") await createChallenge(userId, parsed.data);
    return NextResponse.json({}, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "challenge_save_failed" }, { status: 400 }); }
}
