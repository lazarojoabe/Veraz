type OpenFoodFactsResponse = {
  status?: number | string;
  product?: {
    product_name?: string;
    product_name_pt?: string;
    brands?: string;
    nutriments?: Record<string, number | string | undefined>;
  };
};

export type OpenFoodFactsFood = {
  barcode: string;
  name: string;
  brand: string | null;
  calories: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
  fiberG: number | null;
  sodiumMg: number | null;
};

const asNumber = (value: number | string | undefined) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

export function parseOpenFoodFactsProduct(barcode: string, payload: OpenFoodFactsResponse): OpenFoodFactsFood | null {
  const product = payload.status === 1 || payload.status === "success" ? payload.product : null;
  const name = product?.product_name_pt?.trim() || product?.product_name?.trim();
  const nutrients = product?.nutriments;
  if (!name || !nutrients) return null;

  const calories = asNumber(nutrients["energy-kcal_100g"]) ?? (() => {
    const kilojoules = asNumber(nutrients.energy_100g);
    return kilojoules === null ? null : kilojoules / 4.184;
  })();
  const proteinG = asNumber(nutrients.proteins_100g);
  const carbohydratesG = asNumber(nutrients.carbohydrates_100g);
  const fatG = asNumber(nutrients.fat_100g);
  if (calories === null || proteinG === null || carbohydratesG === null || fatG === null) return null;

  const brand = product.brands?.split(",")[0]?.trim() || null;
  const fiberG = asNumber(nutrients.fiber_100g);
  const sodiumG = asNumber(nutrients.sodium_100g);

  return {
    barcode,
    name,
    brand,
    calories,
    proteinG,
    carbohydratesG,
    fatG,
    fiberG,
    sodiumMg: sodiumG === null ? null : sodiumG * 1000,
  };
}

export async function findOpenFoodFactsProduct(barcode: string) {
  const response = await fetch("https://world.openfoodfacts.org/api/v3/product/" + barcode + ".json", {
    headers: { "User-Agent": "Veraz/1.0 (https://github.com/lazarojoabe/Veraz)" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("open_food_facts_unavailable");
  return parseOpenFoodFactsProduct(barcode, await response.json() as OpenFoodFactsResponse);
}
