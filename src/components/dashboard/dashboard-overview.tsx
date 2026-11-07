"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Flame, Mic, Plus, Sparkles, Utensils } from "lucide-react";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { Card } from "@/components/ui/card";
import { calculateProgress } from "@/lib/nutrition/calculate-progress";
import type { DashboardData } from "@/types/dashboard";

const colors = ["#43c982", "#d5b764", "#8ba6d8"];

export function DashboardOverview({ initialData, connected }: { initialData: DashboardData; connected: boolean }) {
  const [data, setData] = useState(initialData);
  const [clock, setClock] = useState({ dateLabel: "Hoje", greeting: "Olá" });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const now = new Date();
      setClock({
        dateLabel: new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(now),
        greeting: now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    void fetch("/api/dashboard", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<DashboardData>;
      })
      .then(setData)
      .catch(() => undefined);
    return () => controller.abort();
  }, [connected]);

  const progress = calculateProgress(data.today.calories, data.goals.calories);
  const remaining = Math.max(0, data.goals.calories - data.today.calories);
  const macros = [
    { name: "Proteínas", value: data.today.proteinG, goal: data.goals.proteinG },
    { name: "Carboidratos", value: data.today.carbohydratesG, goal: data.goals.carbohydratesG },
    { name: "Gorduras", value: data.today.fatG, goal: data.goals.fatG },
  ];
  const daysWithData = data.week.filter((day) => day.value > 0);
  const average = Math.round(daysWithData.reduce((total, day) => total + day.value, 0) / Math.max(1, daysWithData.length));

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand capitalize">{clock.dateLabel}</p><h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[34px]">{clock.greeting}, {data.displayName}.</h1><p className="mt-2 text-sm text-muted">{remaining > 0 ? `Faltam ${Math.round(remaining).toLocaleString("pt-BR")} kcal para a meta de hoje.` : "Sua meta calórica de hoje foi alcançada."}</p></div>
        <Link href="/meals?mode=manual" className="hidden h-11 items-center gap-2 rounded-xl border border-border bg-white/[0.035] px-4 text-sm font-semibold transition-colors hover:bg-white/[0.07] sm:inline-flex"><Plus size={17} /> Adicionar manualmente</Link>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1.28fr_.72fr]">
        <Card className="relative overflow-hidden p-5 sm:p-7">
          <div className="absolute -right-24 -top-36 size-80 rounded-full bg-brand-strong/15 blur-3xl" />
          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5 sm:gap-7">
              <div className="relative grid size-[132px] shrink-0 place-items-center rounded-full sm:size-[156px]" style={{ background: `conic-gradient(#43c982 ${progress * 3.6}deg, #202923 0deg)` }} role="img" aria-label={`${progress}% da meta diária de calorias`}><div className="grid size-[112px] place-items-center rounded-full bg-surface sm:size-[134px]"><div className="text-center"><Flame className="mx-auto mb-1 text-brand" size={18} /><strong className="block text-2xl font-semibold tracking-tight sm:text-3xl">{Math.round(data.today.calories).toLocaleString("pt-BR")}</strong><span className="text-[11px] text-muted">de {data.goals.calories.toLocaleString("pt-BR")} kcal</span></div></div></div>
              <div><p className="text-xs font-medium uppercase tracking-[0.17em] text-muted">Progresso diário</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{progress}%</p><p className="mt-2 max-w-[220px] text-sm leading-6 text-muted">{data.today.meals.length ? `${data.today.meals.length} registros confirmados hoje.` : "Registre sua primeira refeição do dia."}</p><div className="mt-4 inline-flex rounded-full bg-brand-deep/50 px-2.5 py-1 text-[11px] font-medium text-brand">Sequência de {data.streak} {data.streak === 1 ? "dia" : "dias"}</div></div>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-border pt-5 sm:w-[220px] sm:grid-cols-1 sm:border-l sm:border-t-0 sm:pl-7 sm:pt-0"><Summary label="Consumidas" value={`${Math.round(data.today.calories).toLocaleString("pt-BR")} kcal`} /><Summary label="Restantes" value={`${Math.round(remaining).toLocaleString("pt-BR")} kcal`} brand /><Summary label="Refeições" value={`${data.today.meals.length} registros`} /></div>
          </div>
        </Card>

        <Link href="/meals?mode=voice" className="voice-pulse group relative flex min-h-[220px] overflow-hidden rounded-2xl border border-brand/25 bg-brand-deep/45 p-6 transition-colors hover:border-brand/45 hover:bg-brand-deep/60"><div className="absolute -bottom-24 -right-20 size-64 rounded-full bg-brand/10 blur-3xl" /><div className="relative flex w-full flex-col"><div className="flex items-start justify-between"><span className="voice-pulse__icon grid size-12 place-items-center rounded-2xl bg-brand text-[#07110c]"><Mic size={22} /></span><span className="flex items-center gap-1 text-[11px] font-medium text-brand">Até 30 segundos <Sparkles size={13} /></span></div><div className="mt-auto pt-8"><p className="text-xs font-medium uppercase tracking-[0.16em] text-brand">Registro rápido</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Conte o que você comeu.</h2><p className="mt-2 text-sm leading-6 text-muted">Nós organizamos alimentos e quantidades para você revisar.</p></div></div></Link>
      </section>

      <section><div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold">Macronutrientes</h2><p className="mt-1 text-xs text-muted">Distribuição consumida hoje</p></div><Link href="/settings" className="text-xs font-medium text-brand hover:underline">Ajustar metas</Link></div><div className="grid gap-3 sm:grid-cols-3">{macros.map((macro, index) => { const value = calculateProgress(macro.value, macro.goal); return <Card key={macro.name} className="p-5"><div className="flex items-start justify-between"><span className="text-sm text-muted">{macro.name}</span><span className="text-xs font-semibold" style={{ color: colors[index] }}>{value}%</span></div><p className="mt-4"><strong className="text-2xl font-semibold tracking-tight">{Math.round(macro.value)}g</strong><span className="text-xs text-muted"> / {macro.goal}g</span></p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: colors[index] }} /></div></Card>; })}</div></section>

      <section className="grid gap-4 xl:grid-cols-[1fr_.88fr]">
        <Card className="p-5 sm:p-6"><div className="mb-3 flex items-start justify-between"><div><h2 className="font-semibold">Últimos 7 dias</h2><p className="mt-1 text-xs text-muted">Consumo calórico diário</p></div><span className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-muted">Média {average.toLocaleString("pt-BR")} kcal</span></div><WeeklyChart data={data.week} /></Card>
        <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6"><div><h2 className="font-semibold">Refeições de hoje</h2><p className="mt-1 text-xs text-muted">{data.today.meals.length} registros confirmados</p></div><Link href="/history" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5" aria-label="Ver histórico"><ChevronRight size={18} /></Link></div>{data.today.meals.length ? <div className="divide-y divide-border">{data.today.meals.map((meal) => <div key={meal.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.045] text-muted"><Utensils size={16} /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-medium">{meal.name}</h3><span className="text-[10px] text-muted">{new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(meal.eatenAt))}</span></div><p className="mt-1 truncate text-xs text-muted">{meal.summary}</p></div><strong className="text-xs font-medium">{Math.round(meal.calories)} <span className="font-normal text-muted">kcal</span></strong></div>)}</div> : <div className="px-6 py-12 text-center text-sm text-muted">Nenhuma refeição hoje.</div>}</Card>
      </section>
    </div>
  );
}

function Summary({ label, value, brand = false }: { label: string; value: string; brand?: boolean }) {
  return <div><span className="block text-[10px] uppercase tracking-wider text-muted">{label}</span><strong className={`mt-1 block text-sm ${brand ? "text-brand" : ""}`}>{value}</strong></div>;
}
