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

  it("accepts the natural speech prefix used in the main product journey", () => {
    const result = parseMealTranscript("Comi 150 gramas de arroz, 120 gramas de peito de frango grelhado e 100 gramas de feijão", demoFoods);
    expect(result.unresolved).toEqual([]);
    expect(result.items.map(({ quantity, unit }) => ({ quantity, unit }))).toEqual([
      { quantity: 150, unit: "g" },
      { quantity: 120, unit: "g" },
      { quantity: 100, unit: "g" },
    ]);
  });

  it("converts decimal kilograms and infers units only from reliable catalog conversions", () => {
    const result = parseMealTranscript("1,5 kg de batata doce e uma banana", demoFoods);
    expect(result.unresolved).toEqual([]);
    expect(result.items).toMatchObject([
      { quantity: 1500, unit: "g" },
      { quantity: 1, unit: "unit" },
    ]);
  });

  it("understands common spoken numbers above ten", () => {
    const result = parseMealTranscript("doze ovos", demoFoods);
    expect(result.unresolved).toEqual([]);
    expect(result.items[0]).toMatchObject({ quantity: 12, unit: "unit" });
  });

  it("prefers the standard chicken whole egg and its reliable unit conversion", () => {
    const chickenEgg = { ...demoFoods.find((food) => food.name.startsWith("Ovo"))!, id: "10000000-0000-4000-8000-000000000098" };
    const eggs = [
      { ...chickenEgg, id: "10000000-0000-4000-8000-000000000097", name: "Ovo de codorna inteiro", gramsPerUnit: null },
      chickenEgg,
      { ...chickenEgg, id: "10000000-0000-4000-8000-000000000096", name: "Ovo de galinha clara", gramsPerUnit: null },
    ];
    const result = parseMealTranscript("dois ovos", eggs);

    expect(result.unresolved).toEqual([]);
    expect(result.items).toMatchObject([{ foodId: eggs[1].id, quantity: 2, unit: "unit" }]);
  });

  it("understands slices when the catalog has a reliable grams-per-slice factor", () => {
    const bread = { ...demoFoods[0], id: "10000000-0000-4000-8000-000000000099", name: "Pão de forma tradicional", gramsPerUnit: 25 };
    const result = parseMealTranscript("duas fatias de pão de forma", [bread]);

    expect(result.unresolved).toEqual([]);
    expect(result.items).toMatchObject([{ foodId: bread.id, quantity: 2, unit: "unit" }]);
  });

  it("keeps unmatched content explicit", () => {
    const result = parseMealTranscript("um prato misterioso", demoFoods);
    expect(result.items).toHaveLength(0);
    expect(result.unresolved).toEqual(["um prato misterioso"]);
  });
});
