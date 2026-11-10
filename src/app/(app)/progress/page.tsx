import { ProgressHub } from "@/components/progress/progress-hub";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ProgressPage() {
  return <div className="mx-auto max-w-6xl space-y-7"><header><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-brand">Sua evolução</p><h1 className="text-3xl font-semibold tracking-[-.04em]">Peso, fotos e consistência.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Registre suas métricas, compare check-ins e acompanhe o plano prescrito para você.</p></header><ProgressHub connected={isSupabaseConfigured()} /></div>;
}
