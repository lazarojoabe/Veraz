import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  findCompletedTranscription: vi.fn(),
  canStartTranscription: vi.fn(),
  claimTranscription: vi.fn(),
  completeTranscription: vi.fn(),
  failTranscription: vi.fn(),
  getFoodsByIds: vi.fn(),
  listFoodsForMatching: vi.fn(),
  transcribeWithElevenLabs: vi.fn(),
}));

vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/auth/server-user", () => ({ getServerUserId: () => Promise.resolve("10000000-0000-4000-8000-000000000099") }));
vi.mock("@/repositories/transcriptions.repository", () => mocks);
vi.mock("@/repositories/foods.repository", () => ({
  getFoodsByIds: mocks.getFoodsByIds,
  listFoodsForMatching: mocks.listFoodsForMatching,
}));
vi.mock("@/services/transcription/elevenlabs", () => ({ transcribeWithElevenLabs: mocks.transcribeWithElevenLabs }));

import { POST } from "./route";

function audioRequest(duration = "10", type = "audio/webm") {
  const form = new FormData();
  form.set("audio", new File([new Uint8Array([1, 2, 3])], "refeicao.webm", { type }));
  form.set("durationSeconds", duration);
  return new NextRequest("http://localhost/api/transcriptions", { method: "POST", body: form });
}

describe("POST /api/transcriptions", () => {
  beforeEach(() => {
    process.env.ELEVENLABS_API_KEY = "test-key";
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.canStartTranscription.mockResolvedValue(true);
  });

  afterEach(() => {
    delete process.env.ELEVENLABS_API_KEY;
  });

  it("rejeita tipos e durações fora do contrato antes de chamar o provedor", async () => {
    expect((await POST(audioRequest("10", "text/plain"))).status).toBe(400);
    expect((await POST(audioRequest("31"))).status).toBe(400);
    expect(mocks.transcribeWithElevenLabs).not.toHaveBeenCalled();
  });

  it("reutiliza uma transcrição concluída com o mesmo áudio", async () => {
    const structured = { items: [{ foodId: "10000000-0000-4000-8000-000000000001", quantity: 100, unit: "g", confidence: 0.9, spokenText: "100 gramas de arroz" }], unresolved: [] };
    mocks.findCompletedTranscription.mockResolvedValue({ id: "audit-id", transcript: "100 gramas de arroz", structured_items: structured });
    mocks.getFoodsByIds.mockResolvedValue([{ id: structured.items[0].foodId, name: "Arroz tipo 1" }]);

    const response = await POST(audioRequest());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ cached: true, transcript: "100 gramas de arroz" });
    expect(mocks.transcribeWithElevenLabs).not.toHaveBeenCalled();
    expect(mocks.claimTranscription).not.toHaveBeenCalled();
  });

  it("bloqueia uma chamada concorrente para o mesmo áudio", async () => {
    mocks.findCompletedTranscription.mockResolvedValue(null);
    mocks.claimTranscription.mockResolvedValue({ id: "audit-id", claimed: false, status: "processing", transcript: null, structuredItems: null });

    const response = await POST(audioRequest());
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: "transcription_in_progress" });
    expect(mocks.transcribeWithElevenLabs).not.toHaveBeenCalled();
  });

  it("explica quando a chave da ElevenLabs precisa ser revisada", async () => {
    mocks.findCompletedTranscription.mockResolvedValue(null);
    mocks.claimTranscription.mockResolvedValue({ id: "audit-id", claimed: true, status: "processing" });
    mocks.transcribeWithElevenLabs.mockRejectedValue(new Error("transcription_provider_401"));

    const response = await POST(audioRequest());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "transcription_provider_configuration" });
    expect(mocks.failTranscription).toHaveBeenCalledWith("audit-id", "transcription_provider_401");
  });
});
