import { describe, expect, it } from "vitest";

import { foodSearchTerms } from "@/lib/nutrition/food-search";

describe("foodSearchTerms", () => {
  it("normaliza acentos e remove conectivos para buscas compostas", () => {
    expect(foodSearchTerms("Pão de forma")).toEqual(["pao", "forma"]);
  });

  it("mantém termos relevantes sem repeti-los", () => {
    expect(foodSearchTerms("ovo inteiro ovo")).toEqual(["ovo", "inteiro"]);
  });
});
