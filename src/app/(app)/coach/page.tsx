import { CoachHub } from "@/components/coach/coach-hub";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function CoachPage() {
  return <div className="mx-auto max-w-7xl space-y-7"><header><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-brand">Área profissional</p><h1 className="text-3xl font-semibold tracking-[-.04em]">Acompanhamento de alunos.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Prescreva planos alimentares e fichas de treino, acompanhe check-ins, evolução de peso e fotos em um só lugar.</p></header><CoachHub connected={isSupabaseConfigured()} /></div>;
}
