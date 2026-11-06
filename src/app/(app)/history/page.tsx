import { CalendarDays, ChevronDown, Coffee, Filter, Salad, Utensils } from "lucide-react";
import { Card } from "@/components/ui/card";

const days = [
  { date: "Hoje, 06 de novembro", total: "1.748 kcal", meals: [{ icon: Coffee, name: "Café da manhã", time: "07:42", kcal: 418 }, { icon: Utensils, name: "Almoço", time: "12:18", kcal: 692 }, { icon: Salad, name: "Lanche", time: "16:06", kcal: 286 }] },
  { date: "Quinta, 05 de novembro", total: "2.240 kcal", meals: [{ icon: Coffee, name: "Café da manhã", time: "07:31", kcal: 456 }, { icon: Utensils, name: "Almoço", time: "12:26", kcal: 748 }] },
];

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">Linha do tempo</p><h1 className="text-3xl font-semibold tracking-[-0.04em]">Histórico</h1><p className="mt-2 text-sm text-muted">Revise seus registros e acompanhe sua consistência.</p></div><button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-3.5 text-xs font-medium text-muted hover:bg-white/5"><Filter size={15} /> Filtrar período</button></header>
      <Card className="flex items-center gap-4 p-4"><span className="grid size-10 place-items-center rounded-xl bg-brand-deep/50 text-brand"><CalendarDays size={18} /></span><div className="flex-1"><p className="text-xs text-muted">Período</p><p className="mt-0.5 text-sm font-medium">Últimos 7 dias</p></div><ChevronDown size={16} className="text-muted" /></Card>
      <div className="space-y-6">
        {days.map((day) => <section key={day.date}><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">{day.date}</h2><span className="text-xs text-muted">{day.total}</span></div><Card className="divide-y divide-border overflow-hidden">{day.meals.map(({ icon: Icon, ...meal }) => <div key={`${meal.name}-${meal.time}`} className="flex items-center gap-3 px-4 py-4 sm:px-5"><span className="grid size-10 place-items-center rounded-xl bg-white/[0.045] text-muted"><Icon size={16} /></span><div className="flex-1"><h3 className="text-sm font-medium">{meal.name}</h3><p className="mt-1 text-xs text-muted">{meal.time}</p></div><strong className="text-xs font-medium">{meal.kcal} <span className="font-normal text-muted">kcal</span></strong></div>)}</Card></section>)}
      </div>
    </div>
  );
}
