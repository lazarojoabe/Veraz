import { z } from "zod";

export const createGroupSchema = z.object({ action: z.literal("create_group"), name: z.string().trim().min(2).max(80), description: z.string().trim().max(300).optional() });
export const joinGroupSchema = z.object({ action: z.literal("join_group"), inviteCode: z.string().trim().toUpperCase().regex(/^[A-F0-9]{6,16}$/) });
export const createChallengeSchema = z.object({
  action: z.literal("create_challenge"),
  groupId: z.string().uuid(),
  title: z.string().trim().min(2).max(100),
  metricType: z.enum(["workout_days", "diet_consistency", "evolution_checkins"]),
  startDate: z.string().date(),
  endDate: z.string().date(),
  target: z.coerce.number().int().min(1).max(365),
}).refine((value) => value.endDate >= value.startDate, { path: ["endDate"], message: "invalid_dates" });

export const challengeActionSchema = z.discriminatedUnion("action", [createGroupSchema, joinGroupSchema, createChallengeSchema]);
