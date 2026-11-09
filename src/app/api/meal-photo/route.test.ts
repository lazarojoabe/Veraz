import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  canStart: vi.fn(), createAudit: vi.fn(), analyze: vi.fn(), listFoods: vi.fn(), match: vi.fn(),
}));

vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/auth/server-user", () => ({ getServerUserId: () => Promise.resolve("10000000-0000-4000-8000-000000000099") }));
vi.mock("@/repositories/meal-photo.repository", () => ({
  canStartMealPhotoAnalysis: mocks.canStart,
  createMealPhotoAnalysis: mocks.createAudit,
}));
vi.mock("@/repositories/foods.repository", () => ({ listFoodsForMatching: mocks.listFoods }));
vi.mock("@/services/meal-photo/openai", () => ({ analyzeMealPhotoWithOpenAI: mocks.analyze }));
vi.mock("@/services/meal-photo/match-foods", () => ({ matchMealPhotoToCatalog: mocks.match }));

import { POST } from "./route";

describe("POST /api/meal-photo", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    process.env.OPENAI_API_KEY = "test-key";
    mocks.canStart.mockResolvedValue(true);
    mocks.listFoods.mockResolvedValue([]);
    mocks.analyze.mockResolvedValue({
      analysis: { scene: { quality: "good", issues: [], plateVisible: true, referenceObjectVisible: false }, items: [], caveats: [] },
      model: "vision-test", providerRequestId: "resp_1", inputTokens: 100, outputTokens: 20, latencyMs: 900,
    });
    mocks.match.mockReturnValue({ items: [], unresolved: [], foods: [] });
    mocks.createAudit.mockResolvedValue("30000000-0000-4000-8000-000000000001");
  });

  it("rejeita formatos de imagem não suportados", async () => {
    const form = new FormData();
    form.set("image", new File(["x"], "prato.gif", { type: "image/gif" }));
    const response = await POST(new NextRequest("http://localhost/api/meal-photo", { method: "POST", body: form }));
    expect(response.status).toBe(400);
    expect(mocks.analyze).not.toHaveBeenCalled();
  });

  it("analisa a foto, resolve o catálogo e cria o registro de avaliação", async () => {
    const form = new FormData();
    form.set("image", new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], "prato.jpg", { type: "image/jpeg" }));
    form.set("plateDiameterCm", "26");
    const response = await POST(new NextRequest("http://localhost/api/meal-photo", { method: "POST", body: form }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      analysisId: "30000000-0000-4000-8000-000000000001",
      model: "vision-test",
    });
    expect(mocks.analyze).toHaveBeenCalledWith(expect.objectContaining({ mimeType: "image/jpeg", plateDiameterCm: 26 }));
    expect(mocks.createAudit).toHaveBeenCalledWith(expect.objectContaining({ imageBytes: 4, model: "vision-test" }));
  });
});
