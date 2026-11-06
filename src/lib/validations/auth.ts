import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(128),
});

export const signupSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Informe seu nome.").max(80),
});

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;
