"use client";

import { useEffect, useState } from "react";
import { Coffee, LoaderCircle, Pencil, Salad, Trash2, Utensils } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { appDayKey, dayKeyAsDate, formatAppDate } from "@/lib/dates/app-timezone";

type Meal = {
  id: string;
  name: string;
  mealType: "breakfast" | "lunch" | "snack" | "dinner" | "supper" | "other";
  eatenAt: string;
  calories: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
  itemCount: number;
  items: Array<{ foodName: string; quantity: number; unit: "g" | "ml" | "unit" | "portion"; calories: number; proteinG: number; carbohydratesG: number; fatG: number }>;
};

const demoMeals: Meal[] = [
  { id: "demo-1", name: "Café da manhã", mealType: "breakfast", eatenAt: "2026-11-06T07:42:00-03:00", calories: 418, proteinG: 24, carbohydratesG: 51, fatG: 13, itemCount: 4, items: [{ foodName: "Ovo de galinha inteiro", quantity: 2, unit: "unit", calories: 146, proteinG: 13.3, carbohydratesG: 0.6, fatG: 9.5 }, { foodName: "Pão de trigo francês", quantity: 50, unit: "g", calories: 150, proteinG: 4, carbohydratesG: 29.3, fatG: 1.6 }] },
  { id: "demo-2", name: "Almoço", mealType: "lunch", eatenAt: "2026-11-06T12:18:00-03:00", calories: 692, proteinG: 47, carbohydratesG: 76, fatG: 21, itemCount: 5, items: [{ foodName: "Arroz tipo 1", quantity: 150, unit: "g", calories: 192, proteinG: 3.8, carbohydratesG: 42.2, fatG: 0.3 }, { foodName: "Peito de frango sem pele", quantity: 120, unit: "g", calories: 191, proteinG: 38.4, carbohydratesG: 0, fatG: 3 }] },
  { id: "demo-3", name: "Lanche", mealType: "snack", eatenAt: "2026-11-06T16:06:00-03:00", calories: 286, proteinG: 14, carbohydratesG: 36, fatG: 9, itemCount: 3, items: [{ foodName: "Banana in natura", quantity: 1, unit: "unit", calories: 71, proteinG: 0.8, carbohydratesG: 17.4, fatG: 0.1 }, { foodName: "Aveia em flocos", quantity: 40, unit: "g", calories: 158, proteinG: 5.6, carbohydratesG: 26.6, fatG: 3.4 }] },
];

const iconByType = { breakfast: Coffee, lunch: Utensils, snack: Salad, dinner: Utensils, supper: Coffee, other: Salad };
const unitLabel = { g: "g", ml: "ml", unit: "un.", portion: "porção" } as const;

function formatDate(value: string) {
  return formatAppDate(dayKeyAsDate(value), { weekday: "long", day: "2-digit", month: "long" });
}

function formatTime(value: string) {
  return formatAppDate(value, { hour: "2-digit", minute: "2-digit" });
}

type HistoryPeriod = "7" | "30" | "90";

export function HistoryTimeline({ connected }: { connected: boolean }) {
  const [meals, setMeals] = useState<Meal[]>(connected ? [] : demoMeals);
  const [loading, setLoading] = useState(connected);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<HistoryPeriod>("7");

  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    void fetch(`/api/meals?period=${period}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ meals: Meal[] }>;
      })
      .then((payload) => setMeals(payload.meals))
      .catch((requestError) => {
        if ((requestError as Error).name !== "AbortError") setError("Não foi possível carregar o histórico.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [connected, period]);

  async function remove(meal: Meal) {
    if (!window.confirm(`Excluir “${meal.name}”? Esta ação não pode ser desfeita.`)) return;
    setDeleting(meal.id);
    setError(null);
    try {
      const response = await fetch(`/api/meals/${meal.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setMeals((current) => current.filter((item) => item.id !== meal.id));
    } catch {
      setError("Não foi possível excluir a refeição.");
    } finally {
      setDeleting(null);
    }
  }

  const groups = Map.groupBy(meals, (meal) => appDayKey(meal.eatenAt));

  if (loading) return <Card className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin text-brand" /></Card>;

  return (
    <div className="space-y-6">
      <Card className="flex items-center gap-4 p-4">
        <div className="flex-1"><p className="text-xs text-muted">Período</p><p className="mt-0.5 text-sm font-medium">Histórico nutricional</p></div>
        <select aria-label="Período do histórico" value={period} onChange={(event) => { setLoading(connected); setError(null); setPeriod(event.target.value as HistoryPeriod); }} className="h-10 rounded-xl border border-border bg-surface-raised px-3 text-sm outline-none focus:border-brand/40">
          <option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option>
        </select>
      </Card>
      {!connected && <div className="rounded-xl border border-brand/20 bg-brand-deep/25 px-4 py-3 text-xs text-muted">Exibindo uma prévia. Ao conectar o Supabase, esta linha do tempo passa a mostrar apenas seus registros.</div>}
      {error && <div className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger" role="status">{error}</div>}
      {meals.length === 0 && <Card className="px-5 py-14 text-center"><Salad className="mx-auto text-muted" size={20} /><p className="mt-3 text-sm font-medium">Nenhuma refeição registrada</p><p className="mt-1 text-xs text-muted">Seu histórico aparecerá aqui após o primeiro registro.</p></Card>}
      {[...groups.entries()].map(([day, dayMeals]) => (
        <section key={day}>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold capitalize">{formatDate(day)}</h2><span className="text-xs text-muted">{Math.round(dayMeals.reduce((total, meal) => total + meal.calories, 0)).toLocaleString("pt-BR")} kcal</span></div>
          <Card className="divide-y divide-border overflow-hidden">
            {dayMeals.map((meal) => {
              const Icon = iconByType[meal.mealType];
              return <article key={meal.id}><div className="flex items-center gap-3 px-4 py-4 sm:px-5"><span className="grid size-10 place-items-center rounded-xl bg-white/[0.045] text-muted"><Icon size={16} /></span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-medium">{meal.name}</h3><p className="mt-1 text-xs text-muted">{formatTime(meal.eatenAt)} · {meal.itemCount} {meal.itemCount === 1 ? "item" : "itens"} · P {Math.round(meal.proteinG)}g · C {Math.round(meal.carbohydratesG)}g · G {Math.round(meal.fatG)}g</p></div><strong className="shrink-0 text-xs font-medium">{Math.round(meal.calories)} <span className="font-normal text-muted">kcal</span></strong>{connected && <><Link href={`/meals?mode=manual&edit=${meal.id}`} className="ml-1 p-2 text-muted hover:text-brand" aria-label={`Editar ${meal.name}`}><Pencil size={15} /></Link><button onClick={() => remove(meal)} disabled={deleting === meal.id} className="p-2 text-muted hover:text-danger disabled:opacity-50" aria-label={`Excluir ${meal.name}`}>{deleting === meal.id ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}</button></>}</div><details className="group border-t border-border/70 px-4 py-3 sm:px-5"><summary className="cursor-pointer list-none text-xs font-medium text-brand">Ver alimentos e nutrientes</summary><div className="mt-3 divide-y divide-border/60 rounded-xl border border-border/70">{meal.items.map((item, index) => <div key={`${item.foodName}-${index}`} className="grid gap-1 px-3 py-3 text-xs sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-medium">{item.foodName}</p><p className="mt-1 text-muted">{item.quantity.toLocaleString("pt-BR")} {unitLabel[item.unit]} · P {item.proteinG.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}g · C {item.carbohydratesG.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}g · G {item.fatG.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}g</p></div><strong>{Math.round(item.calories)} kcal</strong></div>)}</div></details></article>;
            })}
          </Card>
        </section>
      ))}
    </div>
  );
}
