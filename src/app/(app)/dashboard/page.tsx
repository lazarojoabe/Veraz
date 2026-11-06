import Link from "next/link";
import { ArrowUpRight, ChevronRight, Flame, Mic, Plus, Sparkles, Utensils } from "lucide-react";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { Card } from "@/components/ui/card";
import { calculateProgress } from "@/lib/nutrition/calculate-progress";

const macros = [
  { name: "Proteínas", value: 112, goal: 150, unit: "g", color: "#43c982" },
  { name: "Carboidratos", value: 168, goal: 240, unit: "g", color: "#d5b764" },
  { name: "Gorduras", value: 54, goal: 70, unit: "g", color: "#8ba6d8" },
];

const meals = [
  { name: "Café da manhã", time: "07:42", summary: "Ovos, pão integral e café", kcal: 418 },
  { name: "Almoço", time: "12:18", summary: "Arroz, frango grelhado e feijão", kcal: 692 },
  { name: "Lanche", time: "16:06", summary: "Iogurte natural, banana e aveia", kcal: 286 },
];

export default function DashboardPage() {
  const calories = { value: 1748, goal: 2300 };
  const progress = calculateProgress(calories.value, calories.goal);
  const remaining = calories.goal - calories.value;

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">Sexta, 06 de novembro</p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[34px]">Boa tarde, Lazar.</h1>
          <p className="mt-2 text-sm text-muted">Seu dia está consistente. Faltam {remaining} kcal para a meta.</p>
        </div>
        <Link href="/meals?mode=manual" className="hidden h-11 items-center gap-2 rounded-xl border border-border bg-white/[0.035] px-4 text-sm font-semibold transition-colors hover:bg-white/[0.07] sm:inline-flex">
          <Plus size={17} aria-hidden="true" /> Adicionar manualmente
        </Link>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1.28fr_.72fr]">
        <Card className="relative overflow-hidden p-5 sm:p-7">
          <div className="absolute -right-24 -top-36 size-80 rounded-full bg-brand-strong/15 blur-3xl" />
          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5 sm:gap-7">
              <div
                className="relative grid size-[132px] shrink-0 place-items-center rounded-full sm:size-[156px]"
                style={{ background: `conic-gradient(#43c982 ${progress * 3.6}deg, #202923 0deg)` }}
                role="img"
                aria-label={`${progress}% da meta diária de calorias`}
              >
                <div className="grid size-[112px] place-items-center rounded-full bg-surface sm:size-[134px]">
                  <div className="text-center">
                    <Flame className="mx-auto mb-1 text-brand" size={18} aria-hidden="true" />
                    <strong className="block text-2xl font-semibold tracking-tight sm:text-3xl">{calories.value.toLocaleString("pt-BR")}</strong>
                    <span className="text-[11px] text-muted">de {calories.goal.toLocaleString("pt-BR")} kcal</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.17em] text-muted">Progresso diário</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{progress}%</p>
                <p className="mt-2 max-w-[220px] text-sm leading-6 text-muted">Dentro da faixa ideal para este horário.</p>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-deep/50 px-2.5 py-1 text-[11px] font-medium text-brand">
                  <ArrowUpRight size={13} aria-hidden="true" /> 6% mais consistente esta semana
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-border pt-5 sm:w-[220px] sm:grid-cols-1 sm:border-l sm:border-t-0 sm:pl-7 sm:pt-0">
              <div><span className="block text-[10px] uppercase tracking-wider text-muted">Consumidas</span><strong className="mt-1 block text-sm">1.748 kcal</strong></div>
              <div><span className="block text-[10px] uppercase tracking-wider text-muted">Restantes</span><strong className="mt-1 block text-sm text-brand">552 kcal</strong></div>
              <div><span className="block text-[10px] uppercase tracking-wider text-muted">Refeições</span><strong className="mt-1 block text-sm">3 registros</strong></div>
            </div>
          </div>
        </Card>

        <Link href="/meals?mode=voice" className="voice-pulse group relative flex min-h-[220px] overflow-hidden rounded-2xl border border-brand/25 bg-brand-deep/45 p-6 transition-colors hover:border-brand/45 hover:bg-brand-deep/60">
          <div className="absolute -bottom-24 -right-20 size-64 rounded-full bg-brand/10 blur-3xl" />
          <div className="relative flex w-full flex-col">
            <div className="flex items-start justify-between">
              <span className="voice-pulse__icon grid size-12 place-items-center rounded-2xl bg-brand text-[#07110c] shadow-[0_10px_35px_rgba(67,201,130,.18)]"><Mic size={22} strokeWidth={2.4} aria-hidden="true" /></span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-brand">Até 30 segundos <Sparkles size={13} aria-hidden="true" /></span>
            </div>
            <div className="mt-auto pt-8">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand">Registro rápido</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Conte o que você comeu.</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Nós organizamos os alimentos e as quantidades para você revisar.</p>
            </div>
          </div>
        </Link>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div><h2 className="font-semibold">Macronutrientes</h2><p className="mt-1 text-xs text-muted">Distribuição consumida hoje</p></div>
          <Link href="/settings" className="text-xs font-medium text-brand hover:underline">Ajustar metas</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {macros.map((macro) => {
            const value = calculateProgress(macro.value, macro.goal);
            return (
              <Card key={macro.name} className="p-5">
                <div className="flex items-start justify-between"><span className="text-sm text-muted">{macro.name}</span><span className="text-xs font-semibold" style={{ color: macro.color }}>{value}%</span></div>
                <p className="mt-4"><strong className="text-2xl font-semibold tracking-tight">{macro.value}{macro.unit}</strong><span className="text-xs text-muted"> / {macro.goal}{macro.unit}</span></p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: macro.color }} /></div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_.88fr]">
        <Card className="p-5 sm:p-6">
          <div className="mb-3 flex items-start justify-between"><div><h2 className="font-semibold">Últimos 7 dias</h2><p className="mt-1 text-xs text-muted">Consumo calórico diário</p></div><span className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-muted">Média 2.021 kcal</span></div>
          <WeeklyChart />
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6"><div><h2 className="font-semibold">Refeições de hoje</h2><p className="mt-1 text-xs text-muted">3 registros confirmados</p></div><Link href="/history" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-foreground" aria-label="Ver histórico"><ChevronRight size={18} /></Link></div>
          <div className="divide-y divide-border">
            {meals.map((meal) => (
              <div key={meal.name} className="flex items-center gap-3 px-5 py-4 sm:px-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.045] text-muted"><Utensils size={16} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-medium">{meal.name}</h3><span className="text-[10px] text-muted">{meal.time}</span></div><p className="mt-1 truncate text-xs text-muted">{meal.summary}</p></div>
                <strong className="text-xs font-medium">{meal.kcal} <span className="font-normal text-muted">kcal</span></strong>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
