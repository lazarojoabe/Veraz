export type TranscriptionUsage = {
  periodDays: number;
  requests: number;
  completed: number;
  failed: number;
  durationSeconds: number;
  audioBytes: number;
  estimatedCostUsd: number;
};
