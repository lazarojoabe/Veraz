import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeMealPhotoWithOpenAI } from "./openai";

describe("analyzeMealPhotoWithOpenAI", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_VISION_MODEL;
  });

  it("envia a imagem sem persistência e valida a resposta estruturada", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_VISION_MODEL = "vision-test";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "resp_123",
      usage: { input_tokens: 200, output_tokens: 80 },
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({
        scene: { quality: "good", issues: [], plateVisible: true, referenceObjectVisible: false },
        items: [{
          visibleName: "arroz branco", preparation: "cozido",
          estimatedGrams: { minimum: 170, likely: 130, maximum: 100 },
          confidence: "medium", portionBasis: "um quarto do prato", catalogSearchTerms: ["arroz"],
        }],
        caveats: ["estimativa visual"],
      }) }] }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await analyzeMealPhotoWithOpenAI({
      bytes: Buffer.from("image"), mimeType: "image/jpeg", plateDiameterCm: 26,
    });

    expect(result.model).toBe("vision-test");
    expect(result.analysis.items[0].estimatedGrams).toEqual({ minimum: 100, likely: 130, maximum: 170 });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string) as { store: boolean; input: unknown[]; text: { format: { type: string } } };
    expect(request.store).toBe(false);
    expect(request.text.format.type).toBe("json_schema");
  });
});

