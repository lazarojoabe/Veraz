import { Camera, Database, LogIn, LogOut, Mic, Rows3, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import Link from "next/link";
import { GoalsForm } from "@/components/settings/goals-form";
import { Card } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logout } from "./actions";
import { TranscriptionUsageCard } from "@/components/settings/transcription-usage";
import { PhotoAnalysisMetrics } from "@/components/settings/photo-analysis-metrics";
import { AccountRoleCard } from "@/components/settings/account-role-card";

const demoGoals = { calories: 2300, proteinG: 150, carbohydratesG: 240, fatG: 70 };

export default function SettingsPage() {
  const configured = isSupabaseConfigured();
  const transcriptionConfigured = Boolean(process.env.ELEVENLABS_API_KEY);
  const photoAnalysisConfigured = Boolean(process.env.OPENAI_API_KEY);
  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">Personalização</p><h1 className="text-3xl font-semibold tracking-[-0.04em]">Metas e ajustes</h1><p className="mt-2 text-sm text-muted">Prepare o VERAZ para acompanhar a sua rotina.</p></header>
      <section><div className="mb-3 flex items-center gap-2"><SlidersHorizontal size={17} className="text-brand" /><h2 className="text-sm font-semibold">Metas diárias</h2></div><GoalsForm initialGoals={demoGoals} connected={configured} /></section>
      <section><div className="mb-3 flex items-center gap-2"><Users size={17} className="text-brand" /><h2 className="text-sm font-semibold">Perfil e acompanhamento</h2></div><AccountRoleCard connected={configured} /></section>
      <section><div className="mb-3 flex items-center gap-2"><Database size={17} className="text-brand" /><h2 className="text-sm font-semibold">Serviços</h2></div><Card className="divide-y divide-border overflow-hidden"><Service icon={ShieldCheck} name="Supabase" description="Autenticação, banco e segurança por usuário" active={configured} /><Service icon={Mic} name="ElevenLabs Scribe v2" description="Transcrição em português, sem guardar o áudio" active={transcriptionConfigured} /><Service icon={Camera} name="OpenAI Vision" description="Estimativa assistida de alimentos e porções, sem guardar a foto" active={photoAnalysisConfigured} /></Card></section>
      <section><div className="mb-3 flex items-center gap-2"><Mic size={17} className="text-brand" /><h2 className="text-sm font-semibold">Consumo da transcrição</h2></div><TranscriptionUsageCard connected={configured} /></section>
      <section><div className="mb-3 flex items-center gap-2"><Camera size={17} className="text-brand" /><h2 className="text-sm font-semibold">Avaliação da análise por foto</h2></div><PhotoAnalysisMetrics enabled={configured && photoAnalysisConfigured} /></section>
      <Link href="/templates" className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-white/[0.03]"><span className="grid size-11 place-items-center rounded-xl bg-brand-deep/45 text-brand"><Rows3 size={19} /></span><div className="flex-1"><p className="text-sm font-medium">Modelos de refeições</p><p className="mt-1 text-xs text-muted">Reutilize combinações que fazem parte da sua rotina.</p></div></Link>
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><div className="flex-1"><p className="text-sm font-medium">Acesso à conta</p><p className="mt-1 text-xs text-muted">{configured ? "Encerre a sessão neste dispositivo com segurança." : "Entre para sincronizar seus dados com segurança."}</p></div>{configured ? <form action={logout}><button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-xs font-semibold hover:bg-white/5"><LogOut size={15} /> Sair da conta</button></form> : <Link href="/login" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-xs font-semibold hover:bg-white/5"><LogIn size={15} /> Ir para o acesso</Link>}</Card>
    </div>
  );
}

function Service({ icon: Icon, name, description, active }: { icon: typeof ShieldCheck; name: string; description: string; active: boolean }) {
  return <div className="flex items-center gap-4 p-5"><span className="grid size-11 place-items-center rounded-xl bg-brand-deep/45 text-brand"><Icon size={19} /></span><div className="flex-1"><p className="text-sm font-medium">{name}</p><p className="mt-1 text-xs text-muted">{description}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${active ? "bg-brand-deep/60 text-brand" : "bg-white/5 text-muted"}`}>{active ? "Conectado" : "Aguardando configuração"}</span></div>;
}
