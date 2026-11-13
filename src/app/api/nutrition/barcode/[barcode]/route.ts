import { NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createOpenFoodFactsFood } from "@/repositories/foods.repository";
import { findOpenFoodFactsProduct } from "@/services/nutrition/open-food-facts";

type BarcodeRouteContext = { params: Promise<{ barcode: string }> };

export async function GET(_request: Request, context: BarcodeRouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "configuration_required", message: "Conecte o Supabase para consultar produtos." }, { status: 503 });
  }
  const userId = await getServerUserId();
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const { barcode } = await context.params;
  if (!/^[0-9]{8,14}$/.test(barcode)) {
    return NextResponse.json({ error: "invalid_barcode", message: "Informe um código de barras com 8 a 14 dígitos." }, { status: 400 });
  }

  try {
    const product = await findOpenFoodFactsProduct(barcode);
    if (!product) {
      return NextResponse.json({
        error: "product_not_found",
        message: "Produto não encontrado ou sem tabela nutricional completa.",
      }, { status: 404 });
    }
    const food = await createOpenFoodFactsFood(userId, product);
    return NextResponse.json({
      food,
      attribution: "Dados do rótulo via Open Food Facts. Confira a embalagem antes de salvar.",
    });
  } catch {
    return NextResponse.json({
      error: "barcode_lookup_unavailable",
      message: "Não foi possível consultar o código de barras agora.",
    }, { status: 502 });
  }
}
