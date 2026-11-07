"use client";

import { useEffect, useState } from "react";
import { Activity, Clock3, Coins, LoaderCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { TranscriptionUsage } from "@/types/transcription";

const emptyUsage: TranscriptionUsage = { periodDays: 30, requests: 0, completed: 0, failed: 0, durationSeconds: 0, audioBytes: 0, estimatedCostUsd: 0 };

export function TranscriptionUsageCard({ connected }: { connected: boolean }) {
  const [usage, setUsage] = useState(emptyUsage);
  const [loading, setLoading] = useState(connected);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    void fetch("/api/transcriptions/usage", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ usage: TranscriptionUsage }>;
      })
      .then((payload) => setUsage(payload.usage))
      .catch((requestError) => {
        if ((requestError as Error).name !== "AbortError") setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [connected]);

  if (loading) return <Card className="grid min-h-32 place-items-center"><LoaderCircle className="animate-spin text-brand" /></Card>;

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-px bg-border sm:grid-cols-3">
        <UsageMetric icon={Activity} label="Solicitações" value={String(usage.requests)} detail={`${usage.completed} concluídas · ${usage.failed} falhas`} />
        <UsageMetric icon={Clock3} label="Áudio processado" value={`${Math.round(usage.durationSeconds)}s`} detail={`${(usage.audioBytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} MB enviados`} />
        <UsageMetric icon={Coins} label="Custo estimado" value={`US$ ${usage.estimatedCostUsd.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`} detail={`Últimos ${usage.periodDays} dias`} />
      </div>
      <p className={`border-t border-border px-5 py-3 text-xs ${error ? "text-danger" : "text-muted"}`}>{error ? "Não foi possível carregar o consumo agora." : connected ? "Estimativa baseada na duração processada; confirme o valor final no provedor." : "O consumo aparecerá aqui após conectar Supabase e ElevenLabs."}</p>
    </Card>
  );
}

function UsageMetric({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) {
  return <div className="bg-surface p-5"><Icon size={16} className="text-brand" /><p className="mt-4 text-xs text-muted">{label}</p><strong className="mt-1 block text-xl font-semibold">{value}</strong><p className="mt-1 text-[11px] text-muted">{detail}</p></div>;
}
