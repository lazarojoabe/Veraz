import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido.")),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(128),
});

export const signupSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Informe seu nome.").max(80),
});

const appDestinations = ["/dashboard", "/meals", "/history", "/templates", "/settings"];

export function safeAppRedirect(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string") return "/dashboard";
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return "/dashboard";
  return appDestinations.some((destination) => path === destination || path.startsWith(`${destination}/`) || path.startsWith(`${destination}?`))
    ? path
    : "/dashboard";
}

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;
