"use client";

import { useEffect, useState } from "react";
import { Check, Flame, LoaderCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { NutritionGoals } from "@/types/nutrition";

const fields = [
  ["calories", "Calorias", "kcal"],
  ["proteinG", "Proteínas", "g"],
  ["carbohydratesG", "Carboidratos", "g"],
  ["fatG", "Gorduras", "g"],
] as const;

export function GoalsForm({ initialGoals, connected }: { initialGoals: NutritionGoals; connected: boolean }) {
  const [goals, setGoals] = useState(initialGoals);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    void fetch("/api/goals", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ goals: NutritionGoals }>;
      })
      .then((payload) => setGoals(payload.goals))
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setMessage("Não foi possível carregar as metas atuais.");
      });
    return () => controller.abort();
  }, [connected]);

  async function submit() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/goals", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(goals) });
      if (!response.ok) throw new Error();
      setMessage("Metas salvas com segurança.");
    } catch {
      setMessage("Conecte o Supabase para persistir as metas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Card className="grid gap-px overflow-hidden bg-border sm:grid-cols-2">
        {fields.map(([key, label, unit], index) => (
          <label key={key} className="bg-surface p-5">
            <span className="flex items-center justify-between text-xs text-muted"><span>{label}</span>{index === 0 && <Flame size={14} className="text-brand" />}</span>
            <span className="mt-3 flex items-baseline gap-2"><input type="number" min="0" step="1" className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none" value={goals[key]} onChange={(event) => setGoals((current) => ({ ...current, [key]: Number(event.target.value) }))} /><span className="text-xs text-muted">{unit}</span></span>
          </label>
        ))}
      </Card>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted" role="status">{message ?? (connected ? "As alterações só são aplicadas ao clicar em salvar." : "Modo demonstrativo: campos editáveis, sem persistência.")}</p><Button onClick={submit} disabled={saving || !connected}>{saving ? <LoaderCircle size={16} className="animate-spin" /> : message?.startsWith("Metas salvas") ? <Check size={16} /> : <Save size={16} />} Salvar metas</Button></div>
    </div>
  );
}
