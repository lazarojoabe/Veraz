import { expect, test } from "@playwright/test";

test("dashboard demonstrativo apresenta a visão nutricional", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /bom dia|boa tarde|boa noite/i })).toBeVisible();
  await expect(page.getByText("Macronutrientes")).toBeVisible();
  await expect(page.getByText("Últimos 7 dias")).toBeVisible();
});

test("registro manual exige revisão antes de persistir", async ({ page }) => {
  await page.goto("/meals?mode=manual");
  await page.getByPlaceholder(/arroz, banana, frango/i).fill("banana");
  await page.getByRole("button", { name: /banana in natura/i }).click();
  await page.getByRole("button", { name: /revisar refeição/i }).click();
  await expect(page.getByRole("heading", { name: "Confira antes de salvar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Supabase não conectado" })).toBeDisabled();
});

test("layout móvel mantém o registro por voz acessível", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Jornada específica do layout móvel");
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Registrar refeição por voz" })).toBeVisible();
});
