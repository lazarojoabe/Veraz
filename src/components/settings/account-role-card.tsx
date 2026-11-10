"use client";

import { useEffect, useState } from "react";
import { Copy, LoaderCircle, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CoachProfile } from "@/types/coach";

export function AccountRoleCard({ connected }: { connected: boolean }) {
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) return;
    void fetch("/api/coach/profile")
      .then((response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ profile: CoachProfile }>; })
      .then((payload) => setProfile(payload.profile))
      .catch(() => setMessage("Não foi possível carregar as configurações de perfil."));
  }, [connected]);

  async function choose(role: CoachProfile["role"]) {
    setSaving(true); setMessage(null);
    try {
      const response = await fetch("/api/coach/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
      if (!response.ok) throw new Error();
      setProfile((current) => current ? { ...current, role } : current);
      setMessage(role === "coach" ? "Perfil de coach ativado. Acesse a Área profissional para conectar alunos." : "Perfil de aluno ativado.");
    } catch { setMessage("Não foi possível atualizar seu perfil."); }
    finally { setSaving(false); }
  }

  async function copyCode() {
    if (!profile) return;
    await navigator.clipboard?.writeText(profile.inviteCode);
    setMessage("Código copiado. Compartilhe-o somente com seu coach.");
  }

  return <Card className="p-5 sm:p-6">
    <div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-deep/45 text-brand"><Users size={19} /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">Perfil de acompanhamento</p><p className="mt-1 text-xs leading-5 text-muted">Defina se você atende alunos como coach ou usa o VERAZ como atleta. Seus dados continuam privados por padrão.</p></div></div>
    {!connected ? <p className="mt-5 text-xs text-muted">Entre na conta para configurar seu perfil e gerar o código de conexão.</p> : !profile ? <div className="mt-5 grid h-12 place-items-center"><LoaderCircle className="animate-spin text-brand" size={18} /></div> : <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button disabled={saving} onClick={() => choose("athlete")} className={`rounded-2xl border p-4 text-left transition-colors ${profile.role === "athlete" ? "border-brand/55 bg-brand-deep/25" : "border-border hover:border-brand/30"}`}><ShieldCheck size={17} className="text-brand" /><strong className="mt-3 block text-sm">Aluno</strong><span className="mt-1 block text-xs leading-5 text-muted">Registre sua rotina e compartilhe somente com quem você conectar.</span></button>
        <button disabled={saving} onClick={() => choose("coach")} className={`rounded-2xl border p-4 text-left transition-colors ${profile.role === "coach" ? "border-brand/55 bg-brand-deep/25" : "border-border hover:border-brand/30"}`}><Users size={17} className="text-brand" /><strong className="mt-3 block text-sm">Coach</strong><span className="mt-1 block text-xs leading-5 text-muted">Conecte alunos, prescreva planos e acompanhe check-ins.</span></button>
      </div>
      <div className="mt-5 rounded-xl border border-border bg-white/[.02] p-3"><p className="text-[11px] font-medium uppercase tracking-[.14em] text-muted">Seu código para convidar um coach</p><div className="mt-2 flex items-center gap-3"><code className="flex-1 text-sm font-semibold tracking-[.16em] text-foreground">{profile.inviteCode}</code><Button variant="secondary" className="h-8 px-3" onClick={copyCode}><Copy size={14} />Copiar</Button></div></div>
      {message && <p className="mt-3 text-xs text-muted" role="status">{message}</p>}
    </>}
  </Card>;
}
