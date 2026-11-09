import { mealPhotoModelAnalysisSchema } from "@/lib/validations/meal-photo";
import type { MealPhotoModelAnalysis } from "@/types/meal-photo";

const DEFAULT_MODEL = "gpt-5.6-terra";

const analysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["scene", "items", "caveats"],
  properties: {
    scene: {
      type: "object",
      additionalProperties: false,
      required: ["quality", "issues", "plateVisible", "referenceObjectVisible"],
      properties: {
        quality: { type: "string", enum: ["good", "limited", "unusable"] },
        issues: { type: "array", maxItems: 8, items: { type: "string" } },
        plateVisible: { type: "boolean" },
        referenceObjectVisible: { type: "boolean" },
      },
    },
    items: {
      type: "array",
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["visibleName", "preparation", "estimatedGrams", "confidence", "portionBasis", "catalogSearchTerms"],
        properties: {
          visibleName: { type: "string" },
          preparation: { type: ["string", "null"] },
          estimatedGrams: {
            type: "object",
            additionalProperties: false,
            required: ["minimum", "likely", "maximum"],
            properties: {
              minimum: { type: "number" },
              likely: { type: "number" },
              maximum: { type: "number" },
            },
          },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          portionBasis: { type: "string" },
          catalogSearchTerms: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
        },
      },
    },
    caveats: { type: "array", maxItems: 8, items: { type: "string" } },
  },
} as const;

type OpenAIResponse = {
  id?: string;
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
};

function extractOutputText(payload: OpenAIResponse) {
  if (payload.output_text) return payload.output_text;
  for (const output of payload.output ?? []) {
    for (const content of output.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("openai_empty_output");
}

function normalizeGramRange(analysis: MealPhotoModelAnalysis): MealPhotoModelAnalysis {
  return {
    ...analysis,
    items: analysis.items.map((item) => {
      const [minimum, likely, maximum] = [
        item.estimatedGrams.minimum,
        item.estimatedGrams.likely,
        item.estimatedGrams.maximum,
      ].sort((a, b) => a - b);
      return { ...item, estimatedGrams: { minimum, likely, maximum } };
    }),
  };
}

export async function analyzeMealPhotoWithOpenAI(input: {
  bytes: Buffer;
  mimeType: string;
  plateDiameterCm: number | null;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("openai_not_configured");
  const model = process.env.OPENAI_VISION_MODEL?.trim() || DEFAULT_MODEL;
  const plateContext = input.plateDiameterCm
    ? `O usuário informou que o prato tem ${input.plateDiameterCm} cm de diâmetro. Use essa escala apenas como referência aproximada.`
    : "O diâmetro do prato não foi informado. Aumente a incerteza da gramatura quando não houver outra referência visual confiável.";

  const prompt = [
    "Analise esta foto de uma refeição para criar um rascunho nutricional assistido.",
    "Identifique somente alimentos visíveis. Descreva cada alimento separadamente, em português do Brasil, incluindo preparo quando visualmente provável.",
    "Estime a massa com uma faixa mínima, provável e máxima. Não trate a estimativa como pesagem e não calcule calorias ou macronutrientes.",
    "Em pratos misturados, não invente ingredientes ocultos. Se a imagem não permitir análise útil, use quality=unusable e items vazio.",
    "portionBasis deve ser uma justificativa curta e observável, como fração do prato ou número de unidades, sem raciocínio interno detalhado.",
    "catalogSearchTerms deve conter termos simples úteis para procurar o item em catálogos brasileiros TACO/TBCA.",
    plateContext,
  ].join(" ");

  const startedAt = Date.now();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 2500,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: `data:${input.mimeType};base64,${input.bytes.toString("base64")}`, detail: "high" },
        ],
      }],
      text: {
        format: {
          type: "json_schema",
          name: "meal_photo_analysis",
          strict: true,
          schema: analysisJsonSchema,
        },
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const latencyMs = Date.now() - startedAt;
  const payload = (await response.json().catch(() => null)) as OpenAIResponse | null;
  if (!response.ok || !payload) throw new Error(`openai_provider_${response.status}`);

  const parsedJson = JSON.parse(extractOutputText(payload)) as unknown;
  const parsed = mealPhotoModelAnalysisSchema.safeParse(parsedJson);
  if (!parsed.success) throw new Error("openai_invalid_structured_output");

  return {
    analysis: normalizeGramRange(parsed.data),
    model,
    providerRequestId: payload.id ?? null,
    inputTokens: payload.usage?.input_tokens ?? null,
    outputTokens: payload.usage?.output_tokens ?? null,
    latencyMs,
  };
}

