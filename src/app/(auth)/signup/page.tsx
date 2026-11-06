import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";
import { signup } from "./actions";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return <AuthPage mode="signup" action={signup} />;
}
