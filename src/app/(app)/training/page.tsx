import { Suspense } from "react";
import { TrainingHub } from "@/components/training/training-hub";
import { Card } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function TrainingPage() {
  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">Treinos</p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">Registre. Compare. Evolua.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Crie exercícios e fichas, anote cada série e acompanhe sua progressão de carga com dados reais.</p>
        </div>
      </header>
      <Suspense fallback={<Card className="min-h-[420px] animate-pulse bg-surface" aria-label="Carregando treinos" />}>
        <TrainingHub connected={isSupabaseConfigured()} />
      </Suspense>
    </div>
  );
}
