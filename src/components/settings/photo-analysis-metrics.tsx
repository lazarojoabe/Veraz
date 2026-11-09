"use client";

import { useEffect, useState } from "react";
import { Camera, LoaderCircle, Scale, Target, Timer } from "lucide-react";
import { Card } from "@/components/ui/card";

type PhotoMetrics = {
  analyses: number;
  confirmedAnalyses: number;
  weighedSamples: number;
  weighedSampleTarget: number;
  weighedSampleProgress: number;
  catalogMatchRate: number | null;
  averageReviewSeconds: number | null;
  correctionRate: number | null;
  weighedMeanAbsoluteGramError: number | null;
  weighedMeanAbsolutePercentageError: number | null;
};

const emptyMetrics: PhotoMetrics = {
  analyses: 0, confirmedAnalyses: 0, weighedSamples: 0, weighedSampleTarget: 100,
  weighedSampleProgress: 0, catalogMatchRate: null, averageReviewSeconds: null,
  correctionRate: null, weighedMeanAbsoluteGramError: null, weighedMeanAbsolutePercentageError: null,
};

function percent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export function PhotoAnalysisMetrics({ enabled }: { enabled: boolean }) {
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void fetch("/api/meal-photo/metrics", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ metrics: PhotoMetrics }>;
      })
      .then((payload) => setMetrics(payload.metrics))
      .catch((requestError) => {
        if ((requestError as Error).name !== "AbortError") setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled]);

  if (loading) return <Card className="grid min-h-36 place-items-center"><LoaderCircle className="animate-spin text-brand" /></Card>;

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Camera} label="Análises confirmadas" value={String(metrics.confirmedAnalyses)} detail={`${metrics.analyses} fotos analisadas`} />
        <Metric icon={Target} label="Associação ao catálogo" value={percent(metrics.catalogMatchRate)} detail={metrics.correctionRate === null ? "Sem revisões suficientes" : `${percent(metrics.correctionRate)} dos itens ajustados`} />
        <Metric icon={Timer} label="Tempo de revisão" value={metrics.averageReviewSeconds === null ? "—" : `${Math.round(metrics.averageReviewSeconds)}s`} detail="Da análise até a confirmação" />
        <Metric icon={Scale} label="Amostras pesadas" value={`${metrics.weighedSamples}/${metrics.weighedSampleTarget}`} detail={metrics.weighedMeanAbsoluteGramError === null ? "Colete pratos conferidos" : `Erro médio ${Math.round(metrics.weighedMeanAbsoluteGramError)} g · ${Math.round(metrics.weighedMeanAbsolutePercentageError ?? 0)}%`} />
      </div>
      <div className="border-t border-border px-5 py-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${Math.round(metrics.weighedSampleProgress * 100)}%` }} /></div>
        <p className={`mt-3 text-xs ${error ? "text-danger" : "text-muted"}`}>{error ? "Não foi possível carregar as métricas. Verifique se a migration da análise por foto foi aplicada." : enabled ? "A meta inicial é reunir 100 pratos brasileiros conferidos com balança. As fotos originais não são armazenadas." : "Configure Supabase e OpenAI para iniciar a avaliação."}</p>
      </div>
    </Card>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Camera; label: string; value: string; detail: string }) {
  return <div className="bg-surface p-5"><Icon size={16} className="text-brand" /><p className="mt-4 text-xs text-muted">{label}</p><strong className="mt-1 block text-xl font-semibold">{value}</strong><p className="mt-1 text-[11px] text-muted">{detail}</p></div>;
}

