import { expect, test } from "@playwright/test";

test("registro por foto comunica estimativa, revisão e privacidade", async ({ page }) => {
  await page.goto("/meals?mode=photo");
  await expect(page.getByRole("link", { name: "Por foto" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fotografe seu prato" })).toBeVisible();
  await expect(page.getByText("Protótipo · revisão obrigatória")).toBeVisible();
  await expect(page.getByText("O VERAZ não armazena a imagem original.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Tirar ou escolher foto/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Analisar refeição" })).toBeVisible();
});

