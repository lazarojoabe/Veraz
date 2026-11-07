"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, LoaderCircle, Play, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Template = { id: string; name: string; description: string | null; itemCount: number; foodNames: string[] };

export function TemplatesList({ connected }: { connected: boolean }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(connected);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/templates", { signal: controller.signal })
      .then((response) => response.json() as Promise<{ templates: Template[] }>)
      .then((payload) => setTemplates(payload.templates))
      .catch(() => setMessage("Não foi possível carregar os modelos."))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  async function use(id: string) {
    setBusy(id); setMessage(null);
    try {
      const response = await fetch(`/api/templates/${id}/use`, { method: "POST" });
      if (!response.ok) throw new Error();
      setMessage("Refeição registrada a partir do modelo.");
    } catch { setMessage("Não foi possível usar o modelo."); }
    finally { setBusy(null); }
  }

  async function remove(id: string) {
    if (!window.confirm("Excluir este modelo?")) return;
    setBusy(id);
    try {
      const response = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setTemplates((current) => current.filter((template) => template.id !== id));
    } catch { setMessage("Não foi possível excluir o modelo."); }
    finally { setBusy(null); }
  }

  if (loading) return <Card className="grid min-h-48 place-items-center"><LoaderCircle className="animate-spin text-brand" /></Card>;

  return (
    <div className="space-y-4">
      {!connected && <div className="rounded-xl border border-brand/20 bg-brand-deep/25 px-4 py-3 text-xs text-muted">Conecte o Supabase para criar e reutilizar modelos.</div>}
      {message && <div className="flex items-center gap-2 rounded-xl border border-brand/20 bg-brand-deep/25 px-4 py-3 text-sm text-brand"><Check size={15} /> {message}</div>}
      {templates.length === 0 ? <Card className="px-5 py-14 text-center"><UtensilsCrossed className="mx-auto text-muted" size={22} /><p className="mt-3 text-sm font-medium">Nenhum modelo criado</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">Monte uma refeição manual, revise os itens e escolha “Salvar como modelo”.</p><Link href="/meals?mode=manual" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-xs font-semibold text-[#07110c]"><Plus size={15} /> Montar refeição</Link></Card> : <div className="grid gap-3 sm:grid-cols-2">{templates.map((template) => <Card key={template.id} className="p-5"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-brand-deep/45 text-brand"><UtensilsCrossed size={17} /></span><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold">{template.name}</h2><p className="mt-1 text-xs text-muted">{template.itemCount} {template.itemCount === 1 ? "item" : "itens"}</p></div><button onClick={() => remove(template.id)} disabled={busy === template.id} className="p-2 text-muted hover:text-danger"><Trash2 size={15} /></button></div><p className="mt-4 line-clamp-2 text-xs leading-5 text-muted">{template.foodNames.join(", ") || template.description || "Modelo pessoal"}</p><Button className="mt-5 w-full" variant="secondary" onClick={() => use(template.id)} disabled={busy === template.id}>{busy === template.id ? <LoaderCircle size={16} className="animate-spin" /> : <Play size={16} />} Registrar agora</Button></Card>)}</div>}
    </div>
  );
}
