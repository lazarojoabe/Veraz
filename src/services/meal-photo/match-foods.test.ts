import { describe, expect, it } from "vitest";
import { demoFoods } from "@/data/foods";
import { matchMealPhotoToCatalog } from "./match-foods";
import type { MealPhotoModelAnalysis } from "@/types/meal-photo";

function analysis(items: MealPhotoModelAnalysis["items"]): MealPhotoModelAnalysis {
  return {
    scene: { quality: "good", issues: [], plateVisible: true, referenceObjectVisible: false },
    items,
    caveats: [],
  };
}

describe("matchMealPhotoToCatalog", () => {
  it("associa descrições visuais comuns ao catálogo brasileiro", () => {
    const result = matchMealPhotoToCatalog(analysis([{
      visibleName: "arroz branco",
      preparation: "cozido",
      estimatedGrams: { minimum: 100, likely: 130, maximum: 170 },
      confidence: "high",
      portionBasis: "aproximadamente um quarto do prato",
      catalogSearchTerms: ["arroz", "arroz branco cozido"],
    }]), demoFoods);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      foodId: "10000000-0000-4000-8000-000000000001",
      quantity: 130,
      unit: "g",
    });
    expect(result.foods[0].name).toBe("Arroz tipo 1");
  });

  it("mantém itens sem correspondência para revisão humana", () => {
    const result = matchMealPhotoToCatalog(analysis([{
      visibleName: "guacamole",
      preparation: null,
      estimatedGrams: { minimum: 30, likely: 50, maximum: 80 },
      confidence: "medium",
      portionBasis: "pequena porção lateral",
      catalogSearchTerms: ["abacate", "guacamole"],
    }]), demoFoods);

    expect(result.items).toHaveLength(0);
    expect(result.unresolved).toHaveLength(1);
  });
});

