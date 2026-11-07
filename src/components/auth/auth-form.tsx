"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthActionState } from "@/lib/validations/auth";

type Action = (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;

export function AuthForm({ mode, action, nextPath }: { mode: "login" | "signup"; action: Action; nextPath?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="mt-8 space-y-4">
      {!isSignup && nextPath && <input type="hidden" name="next" value={nextPath} />}
      {isSignup && (
        <Field name="name" label="Nome" type="text" placeholder="Como podemos chamar você?" icon={UserRound} error={state?.fieldErrors?.name?.[0]} autoComplete="name" />
      )}
      <Field name="email" label="E-mail" type="email" placeholder="voce@exemplo.com" icon={Mail} error={state?.fieldErrors?.email?.[0]} autoComplete="email" />
      <Field name="password" label="Senha" type="password" placeholder="Mínimo de 8 caracteres" icon={LockKeyhole} error={state?.fieldErrors?.password?.[0]} autoComplete={isSignup ? "new-password" : "current-password"} />

      {state?.error && <p className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-3 py-2.5 text-sm text-red-300" role="alert">{state.error}</p>}

      <Button type="submit" className="mt-2 w-full" disabled={pending}>
        {pending ? "Aguarde…" : isSignup ? "Criar minha conta" : "Entrar"}
        {!pending && <ArrowRight size={17} aria-hidden="true" />}
      </Button>

      <p className="pt-2 text-center text-sm text-muted">
        {isSignup ? "Já tem uma conta?" : "Primeira vez por aqui?"}{" "}
        <Link className="font-medium text-brand hover:underline" href={isSignup ? "/login" : "/signup"}>
          {isSignup ? "Entrar" : "Criar conta"}
        </Link>
      </p>
    </form>
  );
}

function Field({ icon: Icon, error, label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; icon: typeof Mail }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-muted">{label}</span>
      <span className="flex h-12 items-center gap-3 rounded-xl border border-border bg-white/[0.025] px-3 transition-colors focus-within:border-brand/60">
        <Icon size={17} className="shrink-0 text-muted" aria-hidden="true" />
        <input className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/50" required {...props} />
      </span>
      {error && <span className="mt-1.5 block text-xs text-red-300">{error}</span>}
    </label>
  );
}
