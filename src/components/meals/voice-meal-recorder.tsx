"use client";

import { useMemo, useRef, useState } from "react";
import { Check, LoaderCircle, Mic, RotateCcw, ShieldCheck, Sparkles, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { calculateMealItem, calculateMealTotals, getAvailableUnits } from "@/services/nutrition/calculations";
import type { FoodCatalogItem, NutritionUnit } from "@/types/nutrition";

type VoiceLine = { key: string; food: FoodCatalogItem; quantity: number; unit: NutritionUnit; confidence: number };

const unitLabels: Record<NutritionUnit, string> = { g: "g", ml: "ml", unit: "unidade", portion: "porção" };

function localDateTimeIso() {
  return new Date().toISOString();
}

export function VoiceMealRecorder({ enabled }: { enabled: boolean }) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);
  const [stage, setStage] = useState<"idle" | "recording" | "transcribing" | "review" | "saved">("idle");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [lines, setLines] = useState<VoiceLine[]>([]);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const calculated = useMemo(
    () => lines.map((line) => calculateMealItem(line.food, { foodId: line.food.id, quantity: line.quantity, unit: line.unit })),
    [lines],
  );
  const totals = useMemo(() => calculateMealTotals(calculated), [calculated]);

  async function sendAudio(blob: Blob, durationSeconds: number) {
    setStage("transcribing");
    const form = new FormData();
    const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    form.set("audio", new File([blob], `refeicao.${extension}`, { type: blob.type }));
    form.set("durationSeconds", String(Math.max(0.1, Math.min(30, durationSeconds))));
    try {
      const response = await fetch("/api/transcriptions", { method: "POST", body: form });
      const payload = (await response.json()) as {
        transcript?: string;
        message?: string;
        items?: { foodId: string; quantity: number; unit: NutritionUnit; confidence: number }[];
        unresolved?: string[];
        foods?: FoodCatalogItem[];
      };
      if (!response.ok) throw new Error(payload.message ?? "Não foi possível transcrever o áudio.");
      const foodMap = new Map((payload.foods ?? []).map((food) => [food.id, food]));
      setTranscript(payload.transcript ?? "");
      setUnresolved(payload.unresolved ?? []);
      setLines((payload.items ?? []).flatMap((item) => {
        const food = foodMap.get(item.foodId);
        return food ? [{ key: crypto.randomUUID(), food, quantity: item.quantity, unit: item.unit, confidence: item.confidence }] : [];
      }));
      setStage("review");
    } catch (error) {
      setMessage((error as Error).message);
      setStage("idle");
    }
  }

  async function startRecording() {
    setMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
        stream.getTracks().forEach((track) => track.stop());
        const duration = (Date.now() - startedAtRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        void sendAudio(blob, duration);
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setSeconds(0);
      setStage("recording");
      recorder.start(250);
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= 30 && recorder.state === "recording") recorder.stop();
      }, 250);
    } catch {
      setMessage("Não foi possível acessar o microfone. Verifique a permissão do navegador.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function save() {
    setMessage(null);
    setStage("transcribing");
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Refeição por voz",
          mealType: "other",
          eatenAt: localDateTimeIso(),
          notes: `Transcrição revisada: ${transcript}`,
          source: "voice",
          items: lines.map((line) => ({ foodId: line.food.id, quantity: line.quantity, unit: line.unit })),
        }),
      });
      if (!response.ok) throw new Error();
      setStage("saved");
      setMessage("Refeição por voz salva no histórico.");
    } catch {
      setStage("review");
      setMessage("Não foi possível salvar. Seus itens continuam disponíveis para revisão.");
    }
  }

  function reset() {
    setStage("idle");
    setSeconds(0);
    setTranscript("");
    setLines([]);
    setUnresolved([]);
    setMessage(null);
  }

  if (stage === "review" || stage === "saved") {
    return (
      <Card className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Revisão antes de salvar</p><h2 className="mt-2 text-xl font-semibold">O que entendemos</h2></div><Button variant="ghost" onClick={reset}><RotateCcw size={16} /> Regravar</Button></div>
        {message && <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${stage === "saved" ? "border-brand/25 bg-brand-deep/25 text-brand" : "border-danger/25 bg-danger/5 text-danger"}`}>{message}</div>}
        <div className="mt-5 rounded-xl border border-border bg-white/[0.025] p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Transcrição</p><p className="mt-2 text-sm leading-6">“{transcript}”</p></div>
        {unresolved.length > 0 && <div className="mt-4 rounded-xl border border-[#d5b764]/25 bg-[#d5b764]/5 px-4 py-3 text-xs text-[#d5b764]">Não encontramos com segurança: {unresolved.join(", ")}. Grave novamente ou adicione esses itens manualmente.</div>}
        <div className="mt-5 space-y-3">
          {lines.map((line, index) => (
            <div key={line.key} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[1fr_9rem_8rem_auto] sm:items-center">
              <div><p className="text-sm font-medium">{line.food.name}</p><p className="mt-1 text-[11px] text-muted">Confiança {Math.round(line.confidence * 100)}% · {calculated[index]?.calories.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kcal</p></div>
              <input type="number" min="0.001" step="any" value={line.quantity} onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, quantity: Number(event.target.value) } : item))} className="h-10 rounded-lg border border-border bg-white/[0.025] px-3 text-sm outline-none focus:border-brand/40" />
              <select value={line.unit} onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, unit: event.target.value as NutritionUnit } : item))} className="h-10 rounded-lg border border-border bg-surface-raised px-2 text-sm outline-none">{getAvailableUnits(line.food).map((unit) => <option key={unit} value={unit}>{unitLabels[unit]}</option>)}</select>
              <button onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} className="p-2 text-muted hover:text-danger" aria-label={`Remover ${line.food.name}`}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2 rounded-xl bg-brand-deep/30 p-4 text-center"><Metric label="Calorias" value={totals.calories} unit="kcal" /><Metric label="Proteínas" value={totals.proteinG} /><Metric label="Carbos" value={totals.carbohydratesG} /><Metric label="Gorduras" value={totals.fatG} /></div>
        {stage !== "saved" && <div className="mt-5 flex justify-end"><Button onClick={save} disabled={!lines.length}><Check size={17} /> Confirmar e salvar</Button></div>}
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden p-6 text-center sm:p-10">
      <div className="absolute left-1/2 top-24 size-56 -translate-x-1/2 rounded-full bg-brand-strong/10 blur-3xl" />
      <div className="relative">
        <span className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-deep/30 px-3 py-1.5 text-[11px] font-medium text-brand"><Sparkles size={13} /> Scribe v2 · português</span>
        <button onClick={stage === "recording" ? stopRecording : startRecording} disabled={!enabled || stage === "transcribing"} className={`mx-auto grid size-28 place-items-center rounded-full border-[7px] border-brand-deep shadow-[0_15px_55px_rgba(67,201,130,.2)] transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50 ${stage === "recording" ? "bg-danger text-white" : "bg-brand text-[#07110c]"}`} aria-label={stage === "recording" ? "Parar gravação" : "Iniciar gravação"}>
          {stage === "transcribing" ? <LoaderCircle size={34} className="animate-spin" /> : stage === "recording" ? <Square size={30} fill="currentColor" /> : <Mic size={36} strokeWidth={2.2} />}
        </button>
        <h2 className="mt-7 text-xl font-semibold">{stage === "recording" ? `Gravando · 00:${String(seconds).padStart(2, "0")}` : stage === "transcribing" ? "Organizando sua refeição…" : "Toque para começar"}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Diga alimentos, quantidades e preparo. Exemplo: “150 gramas de arroz e 120 gramas de frango grelhado”.</p>
        <div className="mx-auto mt-7 flex max-w-md items-center justify-between rounded-xl border border-border bg-white/[0.025] px-4 py-3 text-xs text-muted"><span>Tempo máximo</span><strong className="font-medium text-foreground">00:30</strong></div>
        {!enabled && <p className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2 text-[11px] text-muted"><ShieldCheck size={14} /> Conecte Supabase e ElevenLabs para habilitar a gravação.</p>}
        {message && <p className="mt-4 text-xs text-danger" role="status">{message}</p>}
      </div>
    </Card>
  );
}

function Metric({ label, value, unit = "g" }: { label: string; value: number; unit?: string }) {
  return <div><strong className="block text-sm">{value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</strong><span className="mt-0.5 block text-[10px] text-muted">{label} · {unit}</span></div>;
}
