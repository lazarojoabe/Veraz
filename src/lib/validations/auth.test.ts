import { describe, expect, it } from "vitest";
import { loginSchema, safeAppRedirect, signupSchema } from "./auth";

describe("validação de autenticação", () => {
  it("normaliza e-mails e valida os campos de cadastro", () => {
    expect(loginSchema.parse({ email: " USER@EXAMPLE.COM ", password: "12345678" }).email).toBe("user@example.com");
    expect(signupSchema.safeParse({ name: "A", email: "inválido", password: "curta" }).success).toBe(false);
  });

  it("permite apenas retornos internos para áreas do aplicativo", () => {
    expect(safeAppRedirect("/history?period=30")).toBe("/history?period=30");
    expect(safeAppRedirect("https://example.com")).toBe("/dashboard");
    expect(safeAppRedirect("//example.com")).toBe("/dashboard");
    expect(safeAppRedirect("/login")).toBe("/dashboard");
  });
});
