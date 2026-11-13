import { describe, expect, it } from "vitest";

import { parseOpenFoodFactsProduct } from "@/services/nutrition/open-food-facts";

describe("parseOpenFoodFactsProduct", () => {
  it("converte nutrientes por 100 g e sódio em miligramas", () => {
    expect(parseOpenFoodFactsProduct("7891000100103", {
      status: "success",
      product: {
        product_name_pt: "Pão de forma",
        brands: "Marca teste, Outra marca",
        nutriments: {
          "energy-kcal_100g": 250,
          proteins_100g: 8,
          carbohydrates_100g: 44,
          fat_100g: 4,
          fiber_100g: 2,
          sodium_100g: 0.416,
        },
      },
    })).toEqual({
      barcode: "7891000100103",
      name: "Pão de forma",
      brand: "Marca teste",
      calories: 250,
      proteinG: 8,
      carbohydratesG: 44,
      fatG: 4,
      fiberG: 2,
      sodiumMg: 416,
    });
  });

  it("recusa produtos sem os macronutrientes necessários", () => {
    expect(parseOpenFoodFactsProduct("7891000100103", {
      status: "success",
      product: { product_name: "Produto sem rótulo", nutriments: { proteins_100g: 1 } },
    })).toBeNull();
  });
});
