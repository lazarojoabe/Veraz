import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ replaceMeal: vi.fn(), deleteMeal: vi.fn(), getMeal: vi.fn(), getFoodsByIds: vi.fn() }));

vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/auth/server-user", () => ({ getServerUserId: () => Promise.resolve("10000000-0000-4000-8000-000000000099") }));
vi.mock("@/repositories/meals.repository", () => ({ replaceMeal: mocks.replaceMeal, deleteMeal: mocks.deleteMeal, getMeal: mocks.getMeal }));
vi.mock("@/repositories/foods.repository", () => ({ getFoodsByIds: mocks.getFoodsByIds }));

import { PUT } from "./route";

describe("PUT /api/meals/[id]", () => {
  it("valida a refeição e preserva o identificador editado", async () => {
    const id = "20000000-0000-4000-8000-000000000001";
    const payload = { name: "Almoço atualizado", mealType: "lunch", eatenAt: "2026-11-07T12:30:00-03:00", notes: "", items: [{ foodId: "10000000-0000-4000-8000-000000000001", quantity: 180, unit: "g" }] };
    mocks.replaceMeal.mockResolvedValue(id);
    const request = new NextRequest(`http://localhost/api/meals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const response = await PUT(request, { params: Promise.resolve({ id }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id });
    expect(mocks.replaceMeal).toHaveBeenCalledWith("10000000-0000-4000-8000-000000000099", id, payload);
  });

  it("rejeita um identificador inválido antes de acessar o repositório", async () => {
    const request = new NextRequest("http://localhost/api/meals/invalido", { method: "PUT", headers: { "Content-Type": "application/json" }, body: "{}" });
    const response = await PUT(request, { params: Promise.resolve({ id: "invalido" }) });
    expect(response.status).toBe(400);
    expect(mocks.replaceMeal).not.toHaveBeenCalled();
  });
});
