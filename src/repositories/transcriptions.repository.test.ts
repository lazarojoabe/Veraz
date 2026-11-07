import { describe, expect, it } from "vitest";
import { summarizeTranscriptionUsage } from "./transcriptions.repository";

describe("summarizeTranscriptionUsage", () => {
  it("soma solicitações, duração, bytes e custo sem expor conteúdo", () => {
    const usage = summarizeTranscriptionUsage([
      { status: "completed", duration_seconds: "12.5", audio_bytes: 12000, estimated_cost_usd: "0.000764" },
      { status: "failed", duration_seconds: 8, audio_bytes: "8000", estimated_cost_usd: null },
      { status: "processing", duration_seconds: null, audio_bytes: null, estimated_cost_usd: null },
    ], 30);

    expect(usage).toEqual({
      periodDays: 30,
      requests: 3,
      completed: 1,
      failed: 1,
      durationSeconds: 20.5,
      audioBytes: 20000,
      estimatedCostUsd: 0.000764,
    });
  });
});
