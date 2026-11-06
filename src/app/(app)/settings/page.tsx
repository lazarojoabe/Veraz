import { Database, Flame, LogIn, ShieldCheck, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const goals = [{ label: "Calorias", value: "2.300", unit: "kcal" }, { label: "Proteínas", value: "150", unit: "g" }, { label: "Carboidratos", value: "240", unit: "g" }, { label: "Gorduras", value: "70", unit: "g" }];

export default function SettingsPage() {
  const configured = isSupabaseConfigured();
  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">Personalização</p><h1 className="text-3xl font-semibold tracking-[-0.04em]">Metas e ajustes</h1><p className="mt-2 text-sm text-muted">Prepare o VERAZ para acompanhar a sua rotina.</p></header>
      <section><div className="mb-3 flex items-center gap-2"><SlidersHorizontal size={17} className="text-brand" /><h2 className="text-sm font-semibold">Metas diárias</h2></div><Card className="grid gap-px overflow-hidden bg-border sm:grid-cols-2">{goals.map((goal, index) => <label key={goal.label} className="bg-surface p-5"><span className="flex items-center justify-between text-xs text-muted"><span>{goal.label}</span>{index === 0 && <Flame size={14} className="text-brand" />}</span><span className="mt-3 flex items-baseline gap-2"><input className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none" defaultValue={goal.value} disabled /><span className="text-xs text-muted">{goal.unit}</span></span></label>)}</Card><p className="mt-2 text-[11px] text-muted/65">A edição e persistência das metas serão habilitadas na Fase 2.</p></section>
      <section><div className="mb-3 flex items-center gap-2"><Database size={17} className="text-brand" /><h2 className="text-sm font-semibold">Serviços</h2></div><Card className="p-5"><div className="flex items-center gap-4"><span className="grid size-11 place-items-center rounded-xl bg-brand-deep/45 text-brand"><ShieldCheck size={19} /></span><div className="flex-1"><p className="text-sm font-medium">Supabase</p><p className="mt-1 text-xs text-muted">Autenticação, banco de dados e segurança por usuário</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${configured ? "bg-brand-deep/60 text-brand" : "bg-white/5 text-muted"}`}>{configured ? "Conectado" : "Aguardando configuração"}</span></div></Card></section>
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><div className="flex-1"><p className="text-sm font-medium">Acesso à conta</p><p className="mt-1 text-xs text-muted">Entre para sincronizar seus dados com segurança.</p></div><Link href="/login" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-xs font-semibold hover:bg-white/5"><LogIn size={15} /> Ir para o acesso</Link></Card>
    </div>
  );
}
