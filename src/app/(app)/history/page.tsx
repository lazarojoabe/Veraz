import { HistoryTimeline } from "@/components/history/history-timeline";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">Linha do tempo</p><h1 className="text-3xl font-semibold tracking-[-0.04em]">Histórico</h1><p className="mt-2 text-sm text-muted">Revise seus registros e acompanhe sua consistência.</p></header>
      <HistoryTimeline connected={isSupabaseConfigured()} />
    </div>
  );
}
