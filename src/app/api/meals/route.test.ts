import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ listMeals: vi.fn(), createMeal: vi.fn(), createVoiceMeal: vi.fn(), createPhotoMeal: vi.fn() }));

vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/auth/server-user", () => ({ getServerUserId: () => Promise.resolve("10000000-0000-4000-8000-000000000099") }));
vi.mock("@/repositories/meals.repository", () => ({
  listMeals: mocks.listMeals,
  createMeal: mocks.createMeal,
  createVoiceMeal: mocks.createVoiceMeal,
  createPhotoMeal: mocks.createPhotoMeal,
}));

import { GET, POST } from "./route";

const mealPayload = {
  name: "Almoço",
  mealType: "lunch",
  eatenAt: "2026-11-07T12:00:00-03:00",
  notes: "",
  source: "manual",
  items: [{ foodId: "10000000-0000-4000-8000-000000000001", quantity: 150, unit: "g" }],
};

describe("GET /api/meals", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-07T12:00:00.000Z"));
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.listMeals.mockResolvedValue([]);
  });

  it("rejects unsupported history periods", async () => {
    const response = await GET(new NextRequest("http://localhost/api/meals?period=14"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "invalid_history_period" });
    expect(mocks.listMeals).not.toHaveBeenCalled();
  });

  it("queries the complete selected period from the local day boundary", async () => {
    const response = await GET(new NextRequest("http://localhost/api/meals?period=30"));
    expect(response.status).toBe(200);
    expect(mocks.listMeals).toHaveBeenCalledWith("10000000-0000-4000-8000-000000000099", {
      limit: 500,
      since: "2026-10-09T03:00:00.000Z",
    });
  });

  it("valida e registra uma refeição manual somente após o POST explícito", async () => {
    mocks.createMeal.mockResolvedValue("20000000-0000-4000-8000-000000000001");
    const request = new NextRequest("http://localhost/api/meals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mealPayload) });
    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(mocks.createMeal).toHaveBeenCalledWith(mealPayload);
    expect(mocks.createVoiceMeal).not.toHaveBeenCalled();
  });

  it("preserva a origem da refeição analisada por foto", async () => {
    mocks.createPhotoMeal.mockResolvedValue("20000000-0000-4000-8000-000000000002");
    const request = new NextRequest("http://localhost/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...mealPayload, source: "photo" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(mocks.createPhotoMeal).toHaveBeenCalledWith({ ...mealPayload, source: "photo" });
    expect(mocks.createMeal).not.toHaveBeenCalled();
  });
});
