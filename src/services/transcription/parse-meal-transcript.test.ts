import { describe, expect, it } from "vitest";
import { demoFoods } from "@/data/foods";
import { parseMealTranscript } from "./parse-meal-transcript";

describe("parseMealTranscript", () => {
  it("extracts common Brazilian quantities without inventing foods", () => {
    const result = parseMealTranscript("150 gramas de arroz e 120 gramas de frango grelhado", demoFoods);
    expect(result.unresolved).toEqual([]);
    expect(result.items).toMatchObject([
      { quantity: 150, unit: "g", foodId: demoFoods[0].id },
      { quantity: 120, unit: "g", foodId: demoFoods[3].id },
    ]);
  });

  it("supports spoken numbers and household units", () => {
    const result = parseMealTranscript("dois ovos e uma unidade de banana", demoFoods);
    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.unit)).toEqual(["unit", "unit"]);
  });

  it("keeps unmatched content explicit", () => {
    const result = parseMealTranscript("um prato misterioso", demoFoods);
    expect(result.items).toHaveLength(0);
    expect(result.unresolved).toEqual(["um prato misterioso"]);
  });
});
