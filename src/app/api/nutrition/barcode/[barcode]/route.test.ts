import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/auth/server-user", () => ({ getServerUserId: () => Promise.resolve("10000000-0000-4000-8000-000000000099") }));
vi.mock("@/repositories/foods.repository", () => ({ createOpenFoodFactsFood: mocks.create }));
vi.mock("@/services/nutrition/open-food-facts", () => ({ findOpenFoodFactsProduct: mocks.find }));

import { GET } from "./route";

const context = (barcode: string) => ({ params: Promise.resolve({ barcode }) });

describe("GET /api/nutrition/barcode/[barcode]", () => {
  beforeEach(() => {
    mocks.find.mockReset();
    mocks.create.mockReset();
  });

  it("rejeita códigos fora do padrão", async () => {
    const response = await GET(new Request("http://localhost/api/nutrition/barcode/123"), context("123"));
    expect(response.status).toBe(400);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("consulta o produto e o salva na base pessoal", async () => {
    const product = {
      barcode: "7891000100103",
      name: "Pão de forma",
      brand: "Marca teste",
      calories: 250,
      proteinG: 8,
      carbohydratesG: 44,
      fatG: 4,
      fiberG: 2,
      sodiumMg: 416,
    };
    mocks.find.mockResolvedValue(product);
    mocks.create.mockResolvedValue({
      id: "10000000-0000-4000-8000-000000000012",
      source: "open_food_facts",
      ...product,
    });

    const response = await GET(new Request("http://localhost/api/nutrition/barcode/7891000100103"), context(product.barcode));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ food: { name: "Pão de forma", source: "open_food_facts" } });
    expect(mocks.find).toHaveBeenCalledWith(product.barcode);
    expect(mocks.create).toHaveBeenCalledWith("10000000-0000-4000-8000-000000000099", product);
  });
});
