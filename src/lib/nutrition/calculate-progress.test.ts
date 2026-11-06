import { describe, expect, it } from "vitest";
import { calculateProgress } from "./calculate-progress";

describe("calculateProgress", () => {
  it("calcula e arredonda a porcentagem consumida", () => {
    expect(calculateProgress(1748, 2300)).toBe(76);
  });

  it("limita o progresso entre zero e cem", () => {
    expect(calculateProgress(-20, 2000)).toBe(0);
    expect(calculateProgress(2500, 2000)).toBe(100);
  });

  it("retorna zero para meta inválida", () => {
    expect(calculateProgress(100, 0)).toBe(0);
    expect(calculateProgress(Number.NaN, 2000)).toBe(0);
  });
});
