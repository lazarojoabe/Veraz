import { describe, expect, it } from "vitest";
import { demoFoods } from "@/data/foods";
import {
  calculateMealItem,
  calculateMealTotals,
  convertToBaseQuantity,
  getAvailableUnits,
} from "./calculations";

describe("nutrition calculations", () => {
  it("scales nutrients from the food base quantity", () => {
    const rice = demoFoods[0];
    const item = calculateMealItem(rice, { foodId: rice.id, quantity: 150, unit: "g" });

    expect(item.calories).toBe(192);
    expect(item.carbohydratesG).toBe(42.15);
    expect(item.convertedGrams).toBe(150);
  });

  it("converts a household unit only when a reliable factor exists", () => {
    const banana = demoFoods.find((food) => food.name.startsWith("Banana"))!;

    expect(getAvailableUnits(banana)).toContain("unit");
    expect(convertToBaseQuantity(banana, 2, "unit")).toBe(130);
    expect(calculateMealItem(banana, { foodId: banana.id, quantity: 1, unit: "unit" }).calories).toBe(70.85);
  });

  it("calculates calories for common portions such as eggs and bread slices", () => {
    const egg = demoFoods.find((food) => food.name.startsWith("Ovo"))!;
    const bread = {
      ...demoFoods[0],
      id: "10000000-0000-4000-8000-000000000099",
      name: "Pão de forma tradicional",
      calories: 250,
      proteinG: 8.6,
      carbohydratesG: 44,
      fatG: 4.4,
      gramsPerUnit: 25,
    };

    expect(calculateMealItem(egg, { foodId: egg.id, quantity: 2, unit: "unit" }).calories).toBe(146);
    expect(calculateMealItem(bread, { foodId: bread.id, quantity: 2, unit: "unit" }).calories).toBe(125);
  });

  it("rejects unsupported conversions instead of guessing", () => {
    const rice = demoFoods[0];
    expect(() => convertToBaseQuantity(rice, 1, "unit")).toThrow(/indisponível/);
  });

  it("adds calculated item totals with stable rounding", () => {
    const rice = demoFoods[0];
    const chicken = demoFoods[3];
    const totals = calculateMealTotals([
      calculateMealItem(rice, { foodId: rice.id, quantity: 150, unit: "g" }),
      calculateMealItem(chicken, { foodId: chicken.id, quantity: 120, unit: "g" }),
    ]);

    expect(totals).toMatchObject({ calories: 382.8, proteinG: 42.15, carbohydratesG: 42.15, fatG: 3.3 });
  });
});
