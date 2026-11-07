import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";
import { login } from "./actions";

export const metadata: Metadata = { title: "Entrar" };
export const instant = false;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const message = params.message;
  const notice =
    message === "check-email"
      ? "Conta criada. Confira seu e-mail para confirmar o acesso."
      : message === "confirmation-error"
        ? "O link de confirmação é inválido ou expirou. Solicite um novo acesso."
        : undefined;
  return <AuthPage mode="login" action={login} notice={notice} nextPath={typeof params.next === "string" ? params.next : undefined} />;
}
