import { CalendarDays, ChevronDown, Filter } from "lucide-react";
import { HistoryTimeline } from "@/components/history/history-timeline";
import { Card } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">Linha do tempo</p><h1 className="text-3xl font-semibold tracking-[-0.04em]">Histórico</h1><p className="mt-2 text-sm text-muted">Revise seus registros e acompanhe sua consistência.</p></div><button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-3.5 text-xs font-medium text-muted hover:bg-white/5"><Filter size={15} /> Filtrar período</button></header>
      <Card className="flex items-center gap-4 p-4"><span className="grid size-10 place-items-center rounded-xl bg-brand-deep/50 text-brand"><CalendarDays size={18} /></span><div className="flex-1"><p className="text-xs text-muted">Período</p><p className="mt-0.5 text-sm font-medium">Últimos 7 dias</p></div><ChevronDown size={16} className="text-muted" /></Card>
      <HistoryTimeline connected={isSupabaseConfigured()} />
    </div>
  );
}
