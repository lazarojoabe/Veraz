export type ChallengeMetric = "workout_days" | "diet_consistency" | "evolution_checkins";

export type ChallengeRankingEntry = { memberId: string; displayName: string; score: number; position: number };

export type Challenge = {
  id: string;
  groupId: string;
  title: string;
  metricType: ChallengeMetric;
  startDate: string;
  endDate: string;
  target: number;
  ranking: ChallengeRankingEntry[];
};

export type ChallengeGroup = {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  memberCount: number;
  challenges: Challenge[];
};
