import Link from "next/link";
import { AudioLines, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
import { AuthForm } from "./auth-form";
import type { AuthActionState } from "@/lib/validations/auth";

type Action = (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;

export function AuthPage({ mode, action, notice, nextPath }: { mode: "login" | "signup"; action: Action; notice?: string; nextPath?: string }) {
  const isSignup = mode === "signup";
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden border-r border-border bg-[#0d120f] p-12 lg:flex lg:flex-col">
        <div className="absolute -left-32 top-1/3 size-[32rem] rounded-full bg-brand-strong/20 blur-[110px]" />
        <Brand className="relative" />
        <div className="relative my-auto max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-deep/35 px-3 py-1.5 text-xs font-medium text-brand"><Sparkles size={14} /> Clareza para evoluir</span>
          <h1 className="mt-7 text-5xl font-semibold leading-[1.08] tracking-[-0.055em]">Transforme disciplina em evidência.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted">Registre o que você come com naturalidade. O VERAZ organiza os dados para que seu progresso fique simples de enxergar.</p>
          <div className="mt-12 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-white/[0.025] p-4"><AudioLines className="mb-5 text-brand" size={21} /><p className="text-sm font-medium">Registro por voz</p><p className="mt-1.5 text-xs leading-5 text-muted">Menos atrito, mais consistência.</p></div>
            <div className="rounded-2xl border border-border bg-white/[0.025] p-4"><ShieldCheck className="mb-5 text-brand" size={21} /><p className="text-sm font-medium">Seus dados, só seus</p><p className="mt-1.5 text-xs leading-5 text-muted">Privacidade desde a estrutura.</p></div>
          </div>
        </div>
        <p className="relative text-xs text-muted/65">VERAZ · Seu esforço. Sua evolução.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[430px]">
          <Brand className="mb-14 lg:hidden" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">{isSignup ? "Comece agora" : "Bem-vindo de volta"}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{isSignup ? "Crie sua conta" : "Acesse seu progresso"}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{isSignup ? "Sua jornada começa com dados honestos e consistentes." : "Continue de onde parou, sem perder o ritmo."}</p>
          {notice && <p className="mt-5 rounded-xl border border-brand/20 bg-brand-deep/30 px-3 py-2.5 text-sm leading-6 text-brand">{notice}</p>}
          <AuthForm mode={mode} action={action} nextPath={nextPath} />
          <div className="mt-8 border-t border-border pt-5 text-center"><Link href="/dashboard" className="text-xs text-muted hover:text-foreground">Explorar demonstração sem conta</Link></div>
        </div>
      </section>
    </main>
  );
}
