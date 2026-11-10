import { ChallengesHub } from "@/components/challenges/challenges-hub";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ChallengesPage() {
  return <div className="mx-auto max-w-7xl space-y-7"><header><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-brand">Comunidade</p><h1 className="text-3xl font-semibold tracking-[-.04em]">Desafie sua equipe.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Crie grupos privados, lance metas de treino, constância e evolução. A disputa acontece no ranking — seus registros continuam pessoais.</p></header><ChallengesHub connected={isSupabaseConfigured()} /></div>;
}
