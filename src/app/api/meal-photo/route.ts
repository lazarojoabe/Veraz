import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listFoodsForMatching } from "@/repositories/foods.repository";
import { canStartMealPhotoAnalysis, createMealPhotoAnalysis } from "@/repositories/meal-photo.repository";
import { matchMealPhotoToCatalog } from "@/services/meal-photo/match-foods";
import { analyzeMealPhotoWithOpenAI } from "@/services/meal-photo/openai";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 10 * 1024 * 1024;

function hasExpectedSignature(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "configuration_required", message: "Conecte o Supabase para usar a análise por foto." }, { status: 503 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "vision_not_configured", message: "Configure a análise de imagens no servidor." }, { status: 503 });
  }

  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  const plateValue = form?.get("plateDiameterCm");
  const plateDiameterCm = plateValue ? Number(plateValue) : null;
  if (!(image instanceof File) || !acceptedTypes.has(image.type.split(";")[0]) || image.size <= 0 || image.size > maxBytes) {
    return NextResponse.json({ error: "invalid_image", message: "Envie uma imagem JPEG, PNG ou WebP de até 10 MB." }, { status: 400 });
  }
  if (plateDiameterCm !== null && (!Number.isFinite(plateDiameterCm) || plateDiameterCm < 10 || plateDiameterCm > 60)) {
    return NextResponse.json({ error: "invalid_plate_diameter", message: "Informe um diâmetro de prato entre 10 e 60 cm." }, { status: 400 });
  }

  try {
    if (!(await canStartMealPhotoAnalysis(userId))) {
      return NextResponse.json({ error: "rate_limited", message: "Você atingiu o limite temporário de análises. Aguarde alguns minutos." }, { status: 429 });
    }
    const bytes = Buffer.from(await image.arrayBuffer());
    const mimeType = image.type.split(";")[0];
    if (!hasExpectedSignature(bytes, mimeType)) {
      return NextResponse.json({ error: "invalid_image_content", message: "O conteúdo do arquivo não corresponde a uma imagem válida." }, { status: 400 });
    }
    const [provider, catalog] = await Promise.all([
      analyzeMealPhotoWithOpenAI({ bytes, mimeType, plateDiameterCm }),
      listFoodsForMatching(),
    ]);
    const resolved = matchMealPhotoToCatalog(provider.analysis, catalog);
    const analysisId = await createMealPhotoAnalysis({
      userId,
      model: provider.model,
      providerRequestId: provider.providerRequestId,
      imageSha256: createHash("sha256").update(bytes).digest("hex"),
      imageMimeType: mimeType,
      imageBytes: image.size,
      plateDiameterCm,
      latencyMs: provider.latencyMs,
      inputTokens: provider.inputTokens,
      outputTokens: provider.outputTokens,
      rawAnalysis: provider.analysis,
      predictedItems: resolved.items,
    });
    return NextResponse.json({
      analysisId,
      scene: provider.analysis.scene,
      items: resolved.items,
      unresolved: resolved.unresolved,
      caveats: provider.analysis.caveats,
      foods: resolved.foods,
      model: provider.model,
      latencyMs: provider.latencyMs,
    });
  } catch (error) {
    const code = (error as Error).message;
    if (code === "photo_analysis_rate_unavailable" || code === "photo_analysis_audit_failed") {
      return NextResponse.json({ error: "photo_feature_migration_required", message: "A estrutura da análise por foto ainda não foi aplicada ao banco." }, { status: 503 });
    }
    return NextResponse.json({ error: "photo_analysis_failed", message: "Não foi possível analisar esta foto. Tente outra imagem mais nítida." }, { status: 502 });
  }
}
