import { createClient } from "@/lib/supabase/server";
import type { z } from "zod";
import type { challengeActionSchema, createChallengeSchema, createGroupSchema } from "@/lib/validations/challenges";
import type { Challenge, ChallengeGroup, ChallengeRankingEntry } from "@/types/challenges";

type ChallengeRow = { id: string; group_id: string; title: string; metric_type: Challenge["metricType"]; start_date: string; end_date: string; target: number };

function toChallenge(row: ChallengeRow, ranking: ChallengeRankingEntry[]): Challenge {
  return { id: row.id, groupId: row.group_id, title: row.title, metricType: row.metric_type, startDate: row.start_date, endDate: row.end_date, target: row.target, ranking };
}

export async function listChallengeGroups(): Promise<ChallengeGroup[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("challenge_groups").select("id,name,description,invite_code,challenge_group_members(user_id),challenges(id,group_id,title,metric_type,start_date,end_date,target)").order("created_at", { ascending: false });
  if (error) throw new Error("challenge_groups_unavailable");
  const rows = data as unknown as Array<{ id: string; name: string; description: string | null; invite_code: string; challenge_group_members: Array<{ user_id: string }>; challenges: ChallengeRow[] }>;
  return Promise.all(rows.map(async (group) => ({
    id: group.id, name: group.name, description: group.description, inviteCode: group.invite_code, memberCount: group.challenge_group_members.length,
    challenges: await Promise.all(group.challenges.map(async (challenge) => toChallenge(challenge, await getChallengeRanking(challenge.id)))),
  })));
}

export async function getChallengeRanking(challengeId: string): Promise<ChallengeRankingEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_challenge_ranking", { p_challenge_id: challengeId });
  if (error) throw new Error("challenge_ranking_unavailable");
  return (data as Array<{ member_id: string; display_name: string; score: number; position: number }>).map((entry) => ({ memberId: entry.member_id, displayName: entry.display_name, score: Number(entry.score), position: Number(entry.position) }));
}

export async function createChallengeGroup(input: z.infer<typeof createGroupSchema>) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_challenge_group", { p_name: input.name, p_description: input.description ?? "" });
  if (error) throw new Error("challenge_group_save_failed");
}

export async function joinChallengeGroup(input: z.infer<typeof challengeActionSchema> & { action: "join_group" }) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_challenge_group_by_code", { p_invite_code: input.inviteCode });
  if (error) throw new Error(error.code === "P0002" ? "challenge_group_not_found" : "challenge_group_join_failed");
}

export async function createChallenge(userId: string, input: z.infer<typeof createChallengeSchema>) {
  const supabase = await createClient();
  const { error } = await supabase.from("challenges").insert({ group_id: input.groupId, created_by: userId, title: input.title, metric_type: input.metricType, start_date: input.startDate, end_date: input.endDate, target: input.target });
  if (error) throw new Error("challenge_save_failed");
}
