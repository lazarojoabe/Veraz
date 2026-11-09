import { expect, test } from "@playwright/test";

test("dashboard demonstrativo apresenta a visão nutricional", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /bom dia|boa tarde|boa noite/i })).toBeVisible();
  await expect(page.getByText("Macronutrientes")).toBeVisible();
  await expect(page.getByText("Últimos 7 dias")).toBeVisible();
  await expect(page.getByText("12", { exact: true })).toHaveCount(0);
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

test("histórico oferece filtros de período funcionais", async ({ page }) => {
  await page.goto("/history");
  const period = page.getByLabel("Período do histórico");
  await expect(period).toHaveValue("7");
  await period.selectOption("30");
  await expect(period).toHaveValue("30");
  await expect(page.getByText("Almoço", { exact: true })).toBeVisible();
  await page.getByText("Ver alimentos e nutrientes").first().click();
  await expect(page.getByText("Ovo de galinha inteiro")).toBeVisible();
});

test("login preserva apenas um retorno interno seguro", async ({ page }) => {
  await page.goto("/login?next=%2Fhistory%3Fperiod%3D30");
  await expect(page.locator('input[name="next"]')).toHaveValue("/history?period=30");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

test("ajustes apresenta monitoramento de consumo da transcrição", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText("Consumo da transcrição")).toBeVisible();
  await expect(page.getByText("Custo estimado")).toBeVisible();
  await expect(page.getByText(/após conectar Supabase e ElevenLabs/i)).toBeVisible();
});

test("treinos permite usar uma ficha, registrar séries e atualizar o progresso", async ({ page }) => {
  await page.goto("/training");
  await expect(page.getByRole("heading", { name: "Registre. Compare. Evolua." })).toBeVisible();
  await page.getByRole("button", { name: /Treino A · Superiores 3 exercícios/i }).click();
  await page.getByRole("spinbutton", { name: "Peso da série 1 de Supino reto" }).fill("62.5");
  await page.getByRole("button", { name: "Concluir treino" }).click();
  await expect(page.getByText("Treino registrado. Seu progresso já foi atualizado.")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Progresso" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Volume por semana" })).toBeVisible();
});

test("treinos permite cadastrar exercício e montar ficha", async ({ page }) => {
  await page.goto("/training");
  await page.getByRole("tab", { name: "Fichas" }).click();
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Remada cavalinho");
  await page.getByRole("combobox", { name: "Grupo muscular" }).selectOption("back");
  await page.getByRole("textbox", { name: "Equipamento" }).fill("Barra T");
  await page.getByRole("button", { name: "Cadastrar exercício" }).click();
  await expect(page.getByText("Exercício cadastrado e disponível para suas fichas.")).toBeVisible();

  await page.getByRole("textbox", { name: "Nome da ficha" }).fill("Treino C · Costas");
  await page.getByRole("combobox", { name: "Exercício para adicionar" }).selectOption({ label: "Remada cavalinho · Costas" });
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByRole("button", { name: "Salvar ficha" }).click();
  await expect(page.getByRole("heading", { name: "Treino C · Costas" })).toBeVisible();
});

test("PWA publica manifesto instalável e fallback offline", async ({ request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({ short_name: "VERAZ", display: "standalone", start_url: "/dashboard" });
  expect(manifest.icons).toHaveLength(2);

  const offlineResponse = await request.get("/offline");
  expect(offlineResponse.ok()).toBeTruthy();
  expect(await offlineResponse.text()).toContain("Você está offline");
});
