"use client";

import { useEffect, useState } from "react";
import { Coffee, LoaderCircle, Pencil, Salad, Trash2, Utensils } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

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
};

const demoMeals: Meal[] = [
  { id: "demo-1", name: "Café da manhã", mealType: "breakfast", eatenAt: "2026-11-06T07:42:00-03:00", calories: 418, proteinG: 24, carbohydratesG: 51, fatG: 13, itemCount: 4 },
  { id: "demo-2", name: "Almoço", mealType: "lunch", eatenAt: "2026-11-06T12:18:00-03:00", calories: 692, proteinG: 47, carbohydratesG: 76, fatG: 21, itemCount: 5 },
  { id: "demo-3", name: "Lanche", mealType: "snack", eatenAt: "2026-11-06T16:06:00-03:00", calories: 286, proteinG: 14, carbohydratesG: 36, fatG: 9, itemCount: 3 },
];

const iconByType = { breakfast: Coffee, lunch: Utensils, snack: Salad, dinner: Utensils, supper: Coffee, other: Salad };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function HistoryTimeline({ connected }: { connected: boolean }) {
  const [meals, setMeals] = useState<Meal[]>(connected ? [] : demoMeals);
  const [loading, setLoading] = useState(connected);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    void fetch("/api/meals", { signal: controller.signal })
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
  }, [connected]);

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

  const groups = Map.groupBy(meals, (meal) => new Date(meal.eatenAt).toISOString().slice(0, 10));

  if (loading) return <Card className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin text-brand" /></Card>;

  return (
    <div className="space-y-6">
      {!connected && <div className="rounded-xl border border-brand/20 bg-brand-deep/25 px-4 py-3 text-xs text-muted">Exibindo uma prévia. Ao conectar o Supabase, esta linha do tempo passa a mostrar apenas seus registros.</div>}
      {error && <div className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger" role="status">{error}</div>}
      {meals.length === 0 && <Card className="px-5 py-14 text-center"><Salad className="mx-auto text-muted" size={20} /><p className="mt-3 text-sm font-medium">Nenhuma refeição registrada</p><p className="mt-1 text-xs text-muted">Seu histórico aparecerá aqui após o primeiro registro.</p></Card>}
      {[...groups.entries()].map(([day, dayMeals]) => (
        <section key={day}>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold capitalize">{formatDate(day)}</h2><span className="text-xs text-muted">{Math.round(dayMeals.reduce((total, meal) => total + meal.calories, 0)).toLocaleString("pt-BR")} kcal</span></div>
          <Card className="divide-y divide-border overflow-hidden">
            {dayMeals.map((meal) => {
              const Icon = iconByType[meal.mealType];
              return <div key={meal.id} className="flex items-center gap-3 px-4 py-4 sm:px-5"><span className="grid size-10 place-items-center rounded-xl bg-white/[0.045] text-muted"><Icon size={16} /></span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-medium">{meal.name}</h3><p className="mt-1 text-xs text-muted">{formatTime(meal.eatenAt)} · {meal.itemCount} {meal.itemCount === 1 ? "item" : "itens"} · P {Math.round(meal.proteinG)}g · C {Math.round(meal.carbohydratesG)}g · G {Math.round(meal.fatG)}g</p></div><strong className="shrink-0 text-xs font-medium">{Math.round(meal.calories)} <span className="font-normal text-muted">kcal</span></strong>{connected && <><Link href={`/meals?mode=manual&edit=${meal.id}`} className="ml-1 p-2 text-muted hover:text-brand" aria-label={`Editar ${meal.name}`}><Pencil size={15} /></Link><button onClick={() => remove(meal)} disabled={deleting === meal.id} className="p-2 text-muted hover:text-danger disabled:opacity-50" aria-label={`Excluir ${meal.name}`}>{deleting === meal.id ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}</button></>}</div>;
            })}
          </Card>
        </section>
      ))}
    </div>
  );
}
