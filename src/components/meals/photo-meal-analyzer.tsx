"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, ImagePlus, LoaderCircle, Plus, RotateCcw, Scale, Search, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { calculateMealItem, calculateMealTotals } from "@/services/nutrition/calculations";
import type { MealPhotoAnalysisResponse, MealPhotoConfidence } from "@/types/meal-photo";
import type { FoodCatalogItem } from "@/types/nutrition";

type PhotoLine = {
  key: string;
  food: FoodCatalogItem;
  quantity: number;
  predictedGrams: number;
  minimum: number | null;
  maximum: number | null;
  confidence: MealPhotoConfidence | null;
  portionBasis: string | null;
};

const mealTypes = [
  ["breakfast", "Café da manhã"], ["lunch", "Almoço"], ["snack", "Lanche"],
  ["dinner", "Jantar"], ["supper", "Ceia"], ["other", "Outro"],
] as const;

const confidenceLabels: Record<MealPhotoConfidence, string> = { low: "baixa", medium: "média", high: "alta" };

function localDateTimeValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits }).format(value);
}

export function PhotoMealAnalyzer({ enabled }: { enabled: boolean }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const reviewStartedAtRef = useRef(0);
  const [stage, setStage] = useState<"idle" | "analyzing" | "review" | "saving" | "saved">("idle");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [plateDiameterCm, setPlateDiameterCm] = useState("");
  const [analysis, setAnalysis] = useState<MealPhotoAnalysisResponse | null>(null);
  const [lines, setLines] = useState<PhotoLine[]>([]);
  const [message, setMessage] = useState<{ kind: "success" | "error" | "warning"; text: string } | null>(null);
  const [name, setName] = useState("Refeição por foto");
  const [mealType, setMealType] = useState("other");
  const [eatenAt, setEatenAt] = useState(localDateTimeValue);
  const [weighed, setWeighed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodCatalogItem[]>([]);
  const [searching, setSearching] = useState(false);

  const calculated = useMemo(
    () => lines.map((line) => calculateMealItem(line.food, { foodId: line.food.id, quantity: line.quantity, unit: "g" })),
    [lines],
  );
  const totals = useMemo(() => calculateMealTotals(calculated), [calculated]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (stage !== "review" || searchQuery.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/nutrition?q=${encodeURIComponent(searchQuery)}`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const payload = (await response.json()) as { foods: FoodCatalogItem[] };
        setSearchResults(payload.foods);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setMessage({ kind: "error", text: "Não foi possível pesquisar o catálogo agora." });
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [searchQuery, stage]);

  function selectFile(nextFile: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
    setMessage(null);
  }

  async function analyze() {
    if (!file) return;
    setStage("analyzing");
    setMessage(null);
    const form = new FormData();
    form.set("image", file);
    if (plateDiameterCm) form.set("plateDiameterCm", plateDiameterCm);
    try {
      const response = await fetch("/api/meal-photo", { method: "POST", body: form });
      const payload = (await response.json()) as MealPhotoAnalysisResponse & { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Não foi possível analisar a foto.");
      const foodMap = new Map(payload.foods.map((food) => [food.id, food]));
      setAnalysis(payload);
      setLines(payload.items.flatMap((item) => {
        const food = foodMap.get(item.foodId);
        return food ? [{
          key: crypto.randomUUID(),
          food,
          quantity: item.quantity,
          predictedGrams: item.estimatedGrams.likely,
          minimum: item.estimatedGrams.minimum,
          maximum: item.estimatedGrams.maximum,
          confidence: item.modelConfidence,
          portionBasis: item.portionBasis,
        }] : [];
      }));
      reviewStartedAtRef.current = Date.now();
      setStage("review");
    } catch (error) {
      setMessage({ kind: "error", text: (error as Error).message });
      setStage("idle");
    }
  }

  function addFood(food: FoodCatalogItem) {
    setLines((current) => [...current, {
      key: crypto.randomUUID(), food, quantity: food.baseQuantity, predictedGrams: 0,
      minimum: null, maximum: null, confidence: null, portionBasis: null,
    }]);
    setSearchQuery("");
    setSearchResults([]);
  }

  async function save() {
    setStage("saving");
    setMessage(null);
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mealType,
          eatenAt: new Date(eatenAt).toISOString(),
          notes: "Estimativa assistida por foto, revisada pelo usuário.",
          source: "photo",
          items: lines.map((line) => ({ foodId: line.food.id, quantity: line.quantity, unit: "g" })),
        }),
      });
      const mealPayload = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
      if (!response.ok || !mealPayload?.id) throw new Error(mealPayload?.message ?? "Não foi possível salvar a refeição.");

      let metricsSaved = true;
      if (analysis?.analysisId) {
        const confirmation = await fetch(`/api/meal-photo/${analysis.analysisId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mealId: mealPayload.id,
            reviewDurationMs: Math.max(0, Date.now() - reviewStartedAtRef.current),
            measurementMethod: weighed ? "weighed" : "visual_review",
            items: lines.map((line) => ({
              foodId: line.food.id,
              predictedGrams: line.predictedGrams,
              confirmedGrams: line.quantity,
            })),
          }),
        });
        metricsSaved = confirmation.ok;
      }
      setStage("saved");
      setMessage({
        kind: metricsSaved ? "success" : "warning",
        text: metricsSaved ? "Refeição confirmada e salva no histórico." : "Refeição salva, mas as métricas da análise não puderam ser registradas.",
      });
    } catch (error) {
      setMessage({ kind: "error", text: (error as Error).message });
      setStage("review");
    }
  }

  function reset() {
    selectFile(null);
    setStage("idle");
    setPlateDiameterCm("");
    setAnalysis(null);
    setLines([]);
    setMessage(null);
    setName("Refeição por foto");
    setMealType("other");
    setEatenAt(localDateTimeValue());
    setWeighed(false);
    setSearchQuery("");
    setSearchResults([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (stage === "review" || stage === "saving" || stage === "saved") {
    const qualityText = analysis?.scene.quality === "good" ? "Imagem adequada" : analysis?.scene.quality === "limited" ? "Imagem com limitações" : "Imagem insuficiente";
    return (
      <div className="space-y-5">
        <Card className="overflow-hidden">
          <div className="grid md:grid-cols-[16rem_1fr]">
            {previewUrl && <div className="relative min-h-52 bg-black/30"><Image src={previewUrl} alt="Prato enviado para análise" fill unoptimized className="object-cover" /></div>}
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Estimativa assistida</p><h2 className="mt-2 text-xl font-semibold">Revise o que identificamos</h2></div><Button variant="ghost" onClick={reset}><RotateCcw size={16} /> Outra foto</Button></div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px]"><span className="rounded-full bg-brand-deep/40 px-3 py-1 text-brand">{qualityText}</span><span className="rounded-full bg-white/5 px-3 py-1 text-muted">{analysis?.model}</span><span className="rounded-full bg-white/5 px-3 py-1 text-muted">{analysis ? `${(analysis.latencyMs / 1000).toFixed(1)} s` : ""}</span></div>
              <p className="mt-4 text-xs leading-5 text-muted">As quantidades são aproximações visuais. Ajuste os alimentos e gramas antes de salvar.</p>
            </div>
          </div>
        </Card>

        {message && <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${message.kind === "success" ? "border-brand/25 bg-brand-deep/25 text-brand" : message.kind === "warning" ? "border-[#d5b764]/25 bg-[#d5b764]/5 text-[#d5b764]" : "border-danger/25 bg-danger/5 text-danger"}`}>{message.text}</div>}

        {(analysis?.unresolved.length ?? 0) > 0 && <div className="rounded-xl border border-[#d5b764]/25 bg-[#d5b764]/5 px-4 py-3 text-xs leading-5 text-[#d5b764]">Não associamos ao catálogo: {analysis?.unresolved.map((item) => item.visibleName).join(", ")}. Use a busca abaixo para incluir o alimento correto.</div>}

        <Card className="p-5 sm:p-6">
          <fieldset disabled={stage !== "review"} className="space-y-5 disabled:opacity-70">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-muted">Nome<input value={name} maxLength={100} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-white/[0.025] px-3 text-sm text-foreground outline-none focus:border-brand/40" /></label>
              <label className="text-xs text-muted">Tipo<select value={mealType} onChange={(event) => setMealType(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm text-foreground outline-none focus:border-brand/40">{mealTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-xs text-muted sm:col-span-2">Data e hora<input type="datetime-local" value={eatenAt} onChange={(event) => setEatenAt(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-white/[0.025] px-3 text-sm text-foreground outline-none focus:border-brand/40" /></label>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={line.key} className="rounded-xl border border-border p-4">
                  <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{line.food.name}</p><p className="mt-1 text-[11px] leading-5 text-muted">{line.minimum !== null && line.maximum !== null ? `Faixa visual ${formatNumber(line.minimum, 0)}–${formatNumber(line.maximum, 0)} g` : "Adicionado durante a revisão"}{line.confidence ? ` · confiança ${confidenceLabels[line.confidence]}` : ""}</p>{line.portionBasis && <p className="text-[11px] leading-5 text-muted">Base: {line.portionBasis}</p>}</div><button onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} className="p-2 text-muted hover:text-danger" aria-label={`Remover ${line.food.name}`}><Trash2 size={16} /></button></div>
                  <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3"><label className="text-[11px] text-muted">Quantidade confirmada<input type="number" min="1" max="5000" step="1" value={line.quantity} onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, quantity: Number(event.target.value) } : item))} className="mt-1 h-10 w-full rounded-lg border border-border bg-white/[0.025] px-3 text-sm text-foreground outline-none focus:border-brand/40" /></label><span className="mt-5 text-sm text-muted">g · {formatNumber(calculated[index]?.calories ?? 0)} kcal</span></div>
                </div>
              ))}
              {!lines.length && <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center text-xs text-muted">Nenhum item associado. Pesquise os alimentos abaixo para montar a refeição.</div>}
            </div>

            <div className="rounded-xl border border-border p-4"><p className="text-xs font-medium">Corrigir ou adicionar alimento</p><label className="mt-3 flex h-11 items-center gap-2 rounded-xl border border-border bg-white/[0.025] px-3 focus-within:border-brand/40"><Search size={16} className="text-muted" /><input value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); if (event.target.value.trim().length < 2) setSearchResults([]); }} placeholder="Buscar no catálogo brasileiro TACO" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />{searching && <LoaderCircle size={15} className="animate-spin text-brand" />}</label>{searchResults.length > 0 && <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">{searchResults.map((food) => <button key={food.id} type="button" onClick={() => addFood(food)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs hover:bg-white/5"><Plus size={14} className="text-brand" /><span className="min-w-0 flex-1 truncate">{food.name}</span><span className="text-muted">{Math.round(food.calories)} kcal/{food.baseQuantity}g</span></button>)}</div>}</div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white/[0.025] p-4"><input type="checkbox" checked={weighed} onChange={(event) => setWeighed(event.target.checked)} className="mt-0.5 size-4 accent-[var(--brand)]" /><Scale size={17} className="shrink-0 text-brand" /><span><strong className="block text-xs font-medium">Conferi as quantidades com uma balança</strong><span className="mt-1 block text-[11px] leading-5 text-muted">Marque somente se os valores acima foram pesados. Isso ajuda a medir a precisão real sem armazenar a foto.</span></span></label>
          </fieldset>

          <div className="mt-5 grid grid-cols-4 gap-2 rounded-xl bg-brand-deep/30 p-4 text-center"><Metric label="Calorias" value={totals.calories} unit="kcal" /><Metric label="Proteínas" value={totals.proteinG} /><Metric label="Carbos" value={totals.carbohydratesG} /><Metric label="Gorduras" value={totals.fatG} /></div>
          {stage !== "saved" && <div className="mt-5 flex justify-end"><Button onClick={save} disabled={stage === "saving" || !lines.length || lines.some((line) => !Number.isFinite(line.quantity) || line.quantity <= 0) || !name.trim() || !eatenAt}>{stage === "saving" ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />} Confirmar e salvar</Button></div>}
        </Card>
      </div>
    );
  }

  return (
    <Card className="relative overflow-hidden p-5 sm:p-8">
      <div className="absolute -right-24 -top-24 size-64 rounded-full bg-brand/10 blur-3xl" />
      <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-deep/30 px-3 py-1.5 text-[11px] font-medium text-brand"><Sparkles size={13} /> Protótipo · revisão obrigatória</span>
          <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">Fotografe seu prato</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted">Identificamos os alimentos visíveis e sugerimos uma faixa de gramas. Você mantém o controle e confirma tudo antes do registro.</p>
          <div className="mt-5 grid gap-2 text-xs text-muted sm:grid-cols-3"><Hint number="1" text="Foto de cima" /><Hint number="2" text="Prato inteiro visível" /><Hint number="3" text="Boa iluminação" /></div>
          <label className="mt-5 block max-w-xs text-xs text-muted">Diâmetro do prato <span className="text-muted/60">(opcional)</span><div className="relative mt-2"><input type="number" min="10" max="60" step="0.5" value={plateDiameterCm} onChange={(event) => setPlateDiameterCm(event.target.value)} placeholder="Ex.: 26" className="h-11 w-full rounded-xl border border-border bg-white/[0.025] px-3 pr-10 text-sm text-foreground outline-none focus:border-brand/40" /><span className="absolute right-3 top-3 text-xs text-muted">cm</span></div></label>
        </div>

        <div>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} className="sr-only" />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={!enabled || stage === "analyzing"} className="group relative grid min-h-72 w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-brand/35 bg-brand-deep/15 text-center transition-colors hover:bg-brand-deep/25 disabled:cursor-not-allowed disabled:opacity-55">
            {previewUrl ? <Image src={previewUrl} alt="Prévia do prato" fill unoptimized className="object-cover opacity-55 transition-opacity group-hover:opacity-45" /> : null}
            <span className="relative z-10 p-6"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand text-[#07110c]">{stage === "analyzing" ? <LoaderCircle size={24} className="animate-spin" /> : previewUrl ? <Camera size={24} /> : <ImagePlus size={24} />}</span><strong className="mt-4 block text-sm">{stage === "analyzing" ? "Analisando o prato…" : previewUrl ? "Trocar foto" : "Tirar ou escolher foto"}</strong><span className="mt-1 block text-[11px] text-muted">JPEG, PNG ou WebP · até 10 MB</span></span>
          </button>
          <Button className="mt-3 w-full" onClick={analyze} disabled={!enabled || !file || stage === "analyzing"}>{stage === "analyzing" ? <LoaderCircle size={17} className="animate-spin" /> : <Camera size={17} />} Analisar refeição</Button>
          <p className="mt-3 text-center text-[10px] leading-4 text-muted/80">Ao analisar, a foto é enviada à OpenAI com persistência desativada. O VERAZ não armazena a imagem original.</p>
          {!enabled && <p className="mt-3 flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-muted"><ShieldCheck size={14} /> Conecte Supabase e configure a chave OpenAI no servidor.</p>}
          {message && <p className="mt-3 text-center text-xs text-danger" role="status">{message.text}</p>}
        </div>
      </div>
    </Card>
  );
}

function Hint({ number, text }: { number: string; text: string }) {
  return <div className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2"><span className="grid size-5 place-items-center rounded-full bg-brand-deep text-[10px] font-semibold text-brand">{number}</span>{text}</div>;
}

function Metric({ label, value, unit = "g" }: { label: string; value: number; unit?: string }) {
  return <div><strong className="block text-sm">{formatNumber(value)}</strong><span className="mt-0.5 block text-[10px] text-muted">{label} · {unit}</span></div>;
}
