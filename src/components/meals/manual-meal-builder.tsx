"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, LoaderCircle, PackagePlus, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { demoFoods, searchDemoFoods } from "@/data/foods";
import {
  calculateMealItem,
  calculateMealTotals,
  getAvailableUnits,
} from "@/services/nutrition/calculations";
import type { FoodCatalogItem, NutritionUnit } from "@/types/nutrition";

type Line = {
  key: string;
  food: FoodCatalogItem;
  quantity: number;
  unit: NutritionUnit;
};

const unitLabels: Record<NutritionUnit, string> = {
  g: "g",
  ml: "ml",
  unit: "unidade",
  portion: "porção",
};

const mealTypes = [
  ["breakfast", "Café da manhã"],
  ["lunch", "Almoço"],
  ["snack", "Lanche"],
  ["dinner", "Jantar"],
  ["supper", "Ceia"],
  ["other", "Outro"],
] as const;

function localDateTimeValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits }).format(value);
}

const emptyCustomFood = { name: "", preparation: "", calories: 0, proteinG: 0, carbohydratesG: 0, fatG: 0, fiberG: 0, sodiumMg: 0, gramsPerUnit: 0 };

export function ManualMealBuilder({ connected, editId }: { connected: boolean; editId?: string }) {
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<FoodCatalogItem[]>(connected ? [] : demoFoods);
  const [lines, setLines] = useState<Line[]>([]);
  const [loadingFoods, setLoadingFoods] = useState(connected);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [name, setName] = useState("Refeição manual");
  const [mealType, setMealType] = useState("other");
  const [eatenAt, setEatenAt] = useState(localDateTimeValue);
  const [loadedEdit, setLoadedEdit] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customFood, setCustomFood] = useState(emptyCustomFood);
  const [savingCustom, setSavingCustom] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingFoods(true);
      try {
        const response = await fetch(`/api/nutrition?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const payload = (await response.json()) as { foods: FoodCatalogItem[] };
        setFoods(payload.foods);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStatus({ kind: "error", message: "Não foi possível consultar o catálogo." });
      } finally {
        if (!controller.signal.aborted) setLoadingFoods(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [connected, query]);

  const displayedFoods = connected ? foods : searchDemoFoods(query);

  useEffect(() => {
    if (!editId || loadedEdit || !connected) return;
    const controller = new AbortController();
    void fetch(`/api/meals/${editId}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{
          meal: { name: string; mealType: string; eatenAt: string; items: { foodId: string; quantity: number; unit: NutritionUnit }[] };
          foods: FoodCatalogItem[];
        }>;
      })
      .then(({ meal, foods: mealFoods }) => {
        const foodMap = new Map(mealFoods.map((food) => [food.id, food]));
        setName(meal.name);
        setMealType(meal.mealType);
        const date = new Date(meal.eatenAt);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        setEatenAt(date.toISOString().slice(0, 16));
        setLines(meal.items.flatMap((item) => {
          const food = foodMap.get(item.foodId);
          return food ? [{ key: crypto.randomUUID(), food, quantity: item.quantity, unit: item.unit }] : [];
        }));
        setLoadedEdit(true);
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setStatus({ kind: "error", message: "Não foi possível carregar a refeição para edição." });
      });
    return () => controller.abort();
  }, [connected, editId, loadedEdit]);

  const calculatedItems = useMemo(
    () => lines.map((line) => calculateMealItem(line.food, { foodId: line.food.id, quantity: line.quantity, unit: line.unit })),
    [lines],
  );
  const totals = useMemo(() => calculateMealTotals(calculatedItems), [calculatedItems]);

  function addFood(food: FoodCatalogItem) {
    setLines((current) => [
      ...current,
      { key: crypto.randomUUID(), food, quantity: food.baseQuantity, unit: food.baseUnit },
    ]);
    setStatus(null);
  }

  function updateLine(key: string, patch: Partial<Pick<Line, "quantity" | "unit">>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  async function saveMeal() {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch(editId ? `/api/meals/${editId}` : "/api/meals", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mealType,
          eatenAt: new Date(eatenAt).toISOString(),
          notes: "",
          items: lines.map((line) => ({ foodId: line.food.id, quantity: line.quantity, unit: line.unit })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(payload?.message ?? "Não foi possível salvar a refeição.");

      setReviewing(false);
      setLines([]);
      setStatus({ kind: "success", message: editId ? "Refeição atualizada no histórico." : "Refeição salva no seu histórico." });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function createFood() {
    setSavingCustom(true);
    setStatus(null);
    try {
      const response = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...customFood,
          preparation: customFood.preparation || null,
          fiberG: customFood.fiberG || null,
          sodiumMg: customFood.sodiumMg || null,
          gramsPerUnit: customFood.gramsPerUnit || null,
        }),
      });
      if (!response.ok) throw new Error();
      const { food } = (await response.json()) as { food: FoodCatalogItem };
      setFoods((current) => [food, ...current]);
      addFood(food);
      setCustomFood(emptyCustomFood);
      setCustomOpen(false);
      setStatus({ kind: "success", message: "Alimento personalizado criado e adicionado." });
    } catch {
      setStatus({ kind: "error", message: "Não foi possível criar o alimento personalizado." });
    } finally {
      setSavingCustom(false);
    }
  }

  async function saveAsTemplate() {
    setSavingTemplate(true);
    setStatus(null);
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: "Criado a partir do registro manual",
          items: lines.map((line) => ({ foodId: line.food.id, quantity: line.quantity, unit: line.unit })),
        }),
      });
      if (!response.ok) throw new Error();
      setReviewing(false);
      setStatus({ kind: "success", message: "Modelo salvo. Ele já está disponível em Modelos." });
    } catch {
      setStatus({ kind: "error", message: "Não foi possível salvar o modelo." });
    } finally {
      setSavingTemplate(false);
    }
  }

  return (
    <div className="space-y-5">
      {!connected && (
        <div className="flex items-start gap-3 rounded-xl border border-brand/20 bg-brand-deep/25 px-4 py-3 text-xs leading-5 text-muted">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand" />
          <span>Modo demonstrativo: você pode montar e revisar a refeição. A persistência será liberada após conectar o Supabase.</span>
        </div>
      )}

      {status && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${status.kind === "success" ? "border-brand/25 bg-brand-deep/25 text-brand" : "border-danger/25 bg-danger/5 text-danger"}`} role="status">
          {status.message}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium text-muted">Buscar no catálogo TACO/TBCA</span><button onClick={() => setCustomOpen(true)} disabled={!connected} className="inline-flex items-center gap-1 text-[11px] font-medium text-brand disabled:text-muted" title={connected ? "Criar alimento" : "Conecte o Supabase"}><PackagePlus size={14} /> Criar alimento</button></div>
          <label className="block">
            <span className="flex h-12 items-center gap-3 rounded-xl border border-border bg-white/[0.025] px-3 focus-within:border-brand/40">
              <Search size={18} className="text-muted" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/45" placeholder="Ex.: arroz, banana, frango…" />
              {loadingFoods && <LoaderCircle size={16} className="animate-spin text-brand" />}
            </span>
          </label>

          <div className="mt-4 max-h-[27rem] space-y-2 overflow-y-auto pr-1">
            {!loadingFoods && displayedFoods.length === 0 && <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted">Nenhum alimento encontrado.</p>}
            {displayedFoods.map((food) => (
              <button key={food.id} onClick={() => addFood(food)} className="flex w-full items-center gap-3 rounded-xl border border-border px-3 py-3 text-left transition-colors hover:border-brand/30 hover:bg-white/[0.035]">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-deep/40 text-brand"><Plus size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{food.name}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">{food.preparation ?? "Referência padrão"} · {food.source.toUpperCase()}</span>
                </span>
                <span className="text-right text-xs"><strong>{formatNumber(food.calories, 0)}</strong><span className="block text-[10px] text-muted">kcal/{food.baseQuantity} {unitLabels[food.baseUnit]}</span></span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-semibold">Composição da refeição</p><p className="mt-1 text-xs text-muted">{lines.length} {lines.length === 1 ? "alimento" : "alimentos"}</p></div>
            <span className="rounded-full bg-brand-deep/50 px-3 py-1 text-xs font-medium text-brand">{formatNumber(totals.calories, 0)} kcal</span>
          </div>

          {lines.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border px-5 py-14 text-center"><Plus size={19} className="mx-auto text-muted" /><p className="mt-3 text-sm font-medium">Sua refeição começa aqui</p><p className="mt-1 text-xs text-muted">Adicione alimentos pelo catálogo ao lado.</p></div>
          ) : (
            <div className="mt-5 space-y-3">
              {lines.map((line, index) => (
                <div key={line.key} className="rounded-xl border border-border p-3">
                  <div className="flex items-start gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/5 text-[11px] text-muted">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{line.food.name}</p><p className="mt-0.5 text-[11px] text-muted">{formatNumber(calculatedItems[index].calories)} kcal</p></div><button onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} className="p-1 text-muted hover:text-danger" aria-label={`Remover ${line.food.name}`}><Trash2 size={15} /></button></div>
                  <div className="mt-3 grid grid-cols-[1fr_8rem] gap-2">
                    <input type="number" min="0.001" step="any" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: Number(event.target.value) })} className="h-10 rounded-lg border border-border bg-white/[0.025] px-3 text-sm outline-none focus:border-brand/40" aria-label={`Quantidade de ${line.food.name}`} />
                    <select value={line.unit} onChange={(event) => updateLine(line.key, { unit: event.target.value as NutritionUnit })} className="h-10 rounded-lg border border-border bg-surface-raised px-2 text-sm outline-none focus:border-brand/40" aria-label={`Unidade de ${line.food.name}`}>
                      {getAvailableUnits(line.food).map((unit) => <option key={unit} value={unit}>{unitLabels[unit]}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
            <Macro label="Proteínas" value={totals.proteinG} />
            <Macro label="Carboidratos" value={totals.carbohydratesG} />
            <Macro label="Gorduras" value={totals.fatG} />
          </div>
          <Button className="mt-5 w-full scroll-mb-28" disabled={!lines.length || lines.some((line) => !line.quantity || line.quantity <= 0)} onClick={() => setReviewing(true)}>Revisar refeição <ChevronRight size={17} /></Button>
        </Card>
      </div>

      {reviewing && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="meal-review-title">
          <Card className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-b-none bg-surface-raised p-5 sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Revisão obrigatória</p><h2 id="meal-review-title" className="mt-2 text-xl font-semibold">Confira antes de salvar</h2></div><button onClick={() => setReviewing(false)} className="p-2 text-muted hover:text-foreground" aria-label="Fechar revisão"><X size={19} /></button></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-muted">Nome<input value={name} maxLength={100} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-white/[0.025] px-3 text-sm text-foreground outline-none focus:border-brand/40" /></label>
              <label className="text-xs text-muted">Tipo<select value={mealType} onChange={(event) => setMealType(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-brand/40">{mealTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-xs text-muted sm:col-span-2">Data e hora<input type="datetime-local" value={eatenAt} onChange={(event) => setEatenAt(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-white/[0.025] px-3 text-sm text-foreground outline-none focus:border-brand/40" /></label>
            </div>
            <div className="mt-5 divide-y divide-border rounded-xl border border-border">{calculatedItems.map((item) => <div key={`${item.foodId}-${item.quantity}-${item.unit}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span className="min-w-0 truncate">{item.foodName}<span className="ml-2 text-xs text-muted">{formatNumber(item.quantity)} {unitLabels[item.unit]}</span></span><strong className="shrink-0 text-xs">{formatNumber(item.calories)} kcal</strong></div>)}</div>
            <div className="mt-5 grid grid-cols-4 gap-2 rounded-xl bg-brand-deep/30 p-4 text-center"><Macro label="Calorias" value={totals.calories} unit="kcal" /><Macro label="Proteínas" value={totals.proteinG} /><Macro label="Carbos" value={totals.carbohydratesG} /><Macro label="Gorduras" value={totals.fatG} /></div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={saveAsTemplate} disabled={savingTemplate || !name.trim() || !connected}>{savingTemplate && <LoaderCircle size={16} className="animate-spin" />} Salvar como modelo</Button><Button variant="secondary" onClick={() => setReviewing(false)}>Voltar e editar</Button><Button onClick={saveMeal} disabled={saving || !name.trim() || !connected}>{saving ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />} {connected ? "Confirmar e salvar" : "Supabase não conectado"}</Button></div>
          </Card>
        </div>
      )}

      {customOpen && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="custom-food-title">
          <Card className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none bg-surface-raised p-5 sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Base própria</p><h2 id="custom-food-title" className="mt-2 text-xl font-semibold">Novo alimento</h2><p className="mt-1 text-xs text-muted">Informe os nutrientes para 100 g conforme o rótulo.</p></div><button onClick={() => setCustomOpen(false)} className="p-2 text-muted hover:text-foreground" aria-label="Fechar"><X size={19} /></button></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <CustomInput label="Nome" value={customFood.name} onChange={(value) => setCustomFood((current) => ({ ...current, name: value }))} text />
              <CustomInput label="Preparo ou marca" value={customFood.preparation} onChange={(value) => setCustomFood((current) => ({ ...current, preparation: value }))} text />
              <CustomInput label="Calorias (kcal)" value={customFood.calories} onChange={(value) => setCustomFood((current) => ({ ...current, calories: Number(value) }))} />
              <CustomInput label="Proteínas (g)" value={customFood.proteinG} onChange={(value) => setCustomFood((current) => ({ ...current, proteinG: Number(value) }))} />
              <CustomInput label="Carboidratos (g)" value={customFood.carbohydratesG} onChange={(value) => setCustomFood((current) => ({ ...current, carbohydratesG: Number(value) }))} />
              <CustomInput label="Gorduras (g)" value={customFood.fatG} onChange={(value) => setCustomFood((current) => ({ ...current, fatG: Number(value) }))} />
              <CustomInput label="Fibras (g, opcional)" value={customFood.fiberG} onChange={(value) => setCustomFood((current) => ({ ...current, fiberG: Number(value) }))} />
              <CustomInput label="Sódio (mg, opcional)" value={customFood.sodiumMg} onChange={(value) => setCustomFood((current) => ({ ...current, sodiumMg: Number(value) }))} />
              <CustomInput label="Gramas por unidade (opcional)" value={customFood.gramsPerUnit} onChange={(value) => setCustomFood((current) => ({ ...current, gramsPerUnit: Number(value) }))} />
            </div>
            <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setCustomOpen(false)}>Cancelar</Button><Button onClick={createFood} disabled={savingCustom || customFood.name.trim().length < 2}>{savingCustom && <LoaderCircle size={16} className="animate-spin" />} Criar e adicionar</Button></div>
          </Card>
        </div>
      )}
    </div>
  );
}

function CustomInput({ label, value, onChange, text = false }: { label: string; value: string | number; onChange: (value: string) => void; text?: boolean }) {
  return <label className="text-xs text-muted">{label}<input type={text ? "text" : "number"} min={text ? undefined : "0"} step={text ? undefined : "any"} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-white/[0.025] px-3 text-sm text-foreground outline-none focus:border-brand/40" /></label>;
}

function Macro({ label, value, unit = "g" }: { label: string; value: number; unit?: string }) {
  return <div><strong className="block text-sm">{formatNumber(value)}</strong><span className="mt-0.5 block text-[10px] text-muted">{label} · {unit}</span></div>;
}
