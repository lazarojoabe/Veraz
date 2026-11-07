import Link from "next/link";
import { AudioLines, Keyboard } from "lucide-react";
import { ManualMealBuilder } from "@/components/meals/manual-meal-builder";
import { VoiceMealRecorder } from "@/components/meals/voice-meal-recorder";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

// A seleção da aba depende da URL recebida; o shell continua rápido e esta rota pode bloquear no servidor.
export const instant = false;

export default async function MealsPage({ searchParams }: PageProps<"/meals">) {
  const params = await searchParams;
  const mode = params.mode === "manual" ? "manual" : "voice";
  const editId = typeof params.edit === "string" ? params.edit : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">Novo registro</p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">Adicionar refeição</h1>
        <p className="mt-2 text-sm text-muted">Escolha a forma mais simples para registrar o que você comeu.</p>
      </header>

      <div className="grid grid-cols-2 rounded-xl border border-border bg-surface p-1">
        <Link href="/meals?mode=voice" className={cn("flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors", mode === "voice" ? "bg-brand-deep text-brand" : "text-muted hover:text-foreground")}><AudioLines size={17} /> Por voz</Link>
        <Link href="/meals?mode=manual" className={cn("flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors", mode === "manual" ? "bg-brand-deep text-brand" : "text-muted hover:text-foreground")}><Keyboard size={17} /> Manual</Link>
      </div>

      {mode === "voice" ? <VoiceMealRecorder enabled={isSupabaseConfigured() && Boolean(process.env.ELEVENLABS_API_KEY)} /> : <ManualMealBuilder connected={isSupabaseConfigured()} editId={editId} />}
    </div>
  );
}
