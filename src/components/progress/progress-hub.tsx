"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, Check, ChevronLeft, ChevronRight, Dumbbell, ImagePlus, LineChart as LineChartIcon, LoaderCircle, Scale, Sparkles, Upload } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ClientProgress, ProgressPhoto, WeightLog } from "@/types/coach";

const today = new Date().toISOString().slice(0, 10);
const field = "h-10 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm outline-none transition-colors focus:border-brand/55";

const demoProgress: ClientProgress = {
  client: { id: "demo", displayName: "Você" },
  weights: [
    { id: "w1", weightKg: 84.6, recordedAt: "2026-10-06", note: null },
    { id: "w2", weightKg: 83.9, recordedAt: "2026-10-20", note: "Boa semana de consistência." },
    { id: "w3", weightKg: 83.2, recordedAt: "2026-11-03", note: null },
    { id: "w4", weightKg: 82.8, recordedAt: "2026-11-10", note: "Em jejum." },
  ],
  photos: [{ id: "p1", label: "Frente · início", takenAt: "2026-10-06", url: null }, { id: "p2", label: "Frente · 5 semanas", takenAt: "2026-11-10", url: null }],
  prescriptions: [{ id: "diet", title: "Plano de definição", calories: 2300, proteinG: 170, carbohydratesG: 225, fatG: 68, instructions: "Priorize alimentos in natura, distribua a proteína ao longo do dia e mantenha boa hidratação.", createdAt: "2026-11-04", coachName: "Marina Costa" }],
  plans: [], sessions: [],
};

function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`)); }

export function ProgressHub({ connected }: { connected: boolean }) {
  const [progress, setProgress] = useState<ClientProgress>(demoProgress);
  const [loading, setLoading] = useState(connected);
  const [message, setMessage] = useState<string | null>(null);
  const [savingWeight, setSavingWeight] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [weight, setWeight] = useState("");
  const [weightDate, setWeightDate] = useState(today);
  const [weightNote, setWeightNote] = useState("");
  const [photoDate, setPhotoDate] = useState(today);
  const [photoLabel, setPhotoLabel] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [comparison, setComparison] = useState<[number, number]>([0, 1]);

  const refresh = async () => {
    const response = await fetch("/api/progress");
    if (!response.ok) throw new Error();
    setProgress(await response.json() as ClientProgress);
  };

  useEffect(() => {
    if (!connected) return;
    void refresh().catch(() => setMessage("Não foi possível carregar sua evolução.")).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const orderedWeights = useMemo(() => [...progress.weights].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)), [progress.weights]);
  const orderedPhotos = useMemo(() => [...progress.photos].sort((a, b) => a.takenAt.localeCompare(b.takenAt)), [progress.photos]);
  const latestWeight = orderedWeights.at(-1);
  const weightChange = orderedWeights.length > 1 && latestWeight ? latestWeight.weightKg - orderedWeights[0].weightKg : null;
  const chosenPhotos: [ProgressPhoto | undefined, ProgressPhoto | undefined] = [orderedPhotos[comparison[0]], orderedPhotos[comparison[1]]];

  async function saveWeight(event: React.FormEvent) {
    event.preventDefault();
    setSavingWeight(true); setMessage(null);
    try {
      const response = await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weightKg: Number(weight), recordedAt: weightDate, note: weightNote }) });
      if (!response.ok) throw new Error();
      setWeight(""); setWeightNote(""); await refresh(); setMessage("Peso registrado no seu diário.");
    } catch { setMessage("Não foi possível registrar o peso."); }
    finally { setSavingWeight(false); }
  }

  async function uploadPhoto(event: React.FormEvent) {
    event.preventDefault();
    if (!photoFile) return setMessage("Escolha uma foto para enviar.");
    setUploading(true); setMessage(null);
    try {
      const form = new FormData(); form.set("photo", photoFile); form.set("takenAt", photoDate); form.set("label", photoLabel);
      const response = await fetch("/api/progress", { method: "POST", body: form });
      if (!response.ok) throw new Error();
      setPhotoFile(null); setPhotoLabel(""); await refresh(); setMessage("Foto adicionada à sua evolução.");
    } catch { setMessage("Não foi possível enviar a foto. Use JPG, PNG ou WebP de até 8 MB."); }
    finally { setUploading(false); }
  }

  if (loading) return <Card className="grid min-h-80 place-items-center"><LoaderCircle className="animate-spin text-brand" /></Card>;

  return <div className="space-y-6">
    {!connected && <div className="rounded-2xl border border-brand/20 bg-brand-deep/25 px-4 py-3 text-xs leading-5 text-muted">Prévia do diário de evolução. Conecte sua conta para registrar peso e manter fotos privadas.</div>}
    {message && <p className="rounded-xl border border-brand/20 bg-brand-deep/20 px-4 py-3 text-sm text-foreground" role="status">{message}</p>}
    <div className="grid gap-4 md:grid-cols-3">
      <Stat icon={Scale} label="Peso atual" value={latestWeight ? `${latestWeight.weightKg.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} kg` : "—"} detail={latestWeight ? `registrado em ${formatDate(latestWeight.recordedAt)}` : "faça o primeiro registro"} />
      <Stat icon={LineChartIcon} label="Variação" value={weightChange === null ? "—" : `${weightChange > 0 ? "+" : ""}${weightChange.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`} detail={weightChange === null ? "aguardando histórico" : "desde o primeiro registro"} positive={weightChange !== null && weightChange <= 0} />
      <Stat icon={Camera} label="Check-ins visuais" value={String(progress.photos.length)} detail="fotos privadas na linha do tempo" />
    </div>
    <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand">Diário de peso</p><h2 className="mt-2 text-xl font-semibold">Tendência ao longo do tempo</h2></div><Scale className="text-muted" size={19} /></div>
        {orderedWeights.length > 1 ? <div className="mt-6 h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={orderedWeights.map((item) => ({ ...item, label: formatDate(item.recordedAt) }))} margin={{ left: -22, right: 8 }}><CartesianGrid stroke="#263029" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fill: "#8d9a92", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis dataKey="weightKg" domain={["dataMin - 0.5", "dataMax + 0.5"]} tick={{ fill: "#8d9a92", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#171c19", border: "1px solid #263029", borderRadius: 12, fontSize: 12 }} formatter={(value) => [`${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 1 })} kg`, "Peso"]} /><Line type="monotone" dataKey="weightKg" stroke="#43c982" strokeWidth={3} dot={{ r: 4, fill: "#43c982" }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div> : <div className="grid h-64 place-items-center text-center"><div><Scale className="mx-auto text-muted" size={22} /><p className="mt-3 text-sm font-medium">Registre ao menos dois pesos</p><p className="mt-1 text-xs text-muted">A curva de evolução aparecerá aqui.</p></div></div>}
      </Card>
      <Card className="p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand">Novo registro</p><h2 className="mt-2 text-xl font-semibold">Como você está hoje?</h2><form className="mt-5 space-y-3" onSubmit={saveWeight}><label className="block text-xs text-muted">Peso (kg)<input required disabled={!connected || savingWeight} className={cn(field, "mt-1.5")} type="number" min="20" max="500" step="0.1" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="Ex.: 82,4" /></label><label className="block text-xs text-muted">Data<input disabled={!connected || savingWeight} className={cn(field, "mt-1.5")} type="date" value={weightDate} onChange={(event) => setWeightDate(event.target.value)} /></label><label className="block text-xs text-muted">Observação <span className="text-muted/60">(opcional)</span><input disabled={!connected || savingWeight} className={cn(field, "mt-1.5")} maxLength={500} value={weightNote} onChange={(event) => setWeightNote(event.target.value)} placeholder="Ex.: em jejum" /></label><Button className="w-full" disabled={!connected || savingWeight}>{savingWeight ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />}Registrar peso</Button></form></Card>
    </div>
    {progress.prescriptions[0] && <PrescriptionCard prescription={progress.prescriptions[0]} />}
    <div className="grid gap-6 xl:grid-cols-[.75fr_1.25fr]">
      <Card className="p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand">Check-in visual</p><h2 className="mt-2 text-xl font-semibold">Adicionar foto</h2></div><ImagePlus className="text-muted" size={19} /></div><p className="mt-2 text-sm leading-6 text-muted">Suas fotos são privadas e só podem ser acessadas por você e pelo coach vinculado.</p><form className="mt-5 space-y-3" onSubmit={uploadPhoto}><label className="block text-xs text-muted">Foto<input disabled={!connected || uploading} className="mt-1.5 block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-deep file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)} /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs text-muted">Data<input disabled={!connected || uploading} className={cn(field, "mt-1.5")} type="date" value={photoDate} onChange={(event) => setPhotoDate(event.target.value)} /></label><label className="text-xs text-muted">Legenda<input disabled={!connected || uploading} className={cn(field, "mt-1.5")} maxLength={80} value={photoLabel} onChange={(event) => setPhotoLabel(event.target.value)} placeholder="Frente" /></label></div><Button className="w-full" disabled={!connected || uploading}>{uploading ? <LoaderCircle className="animate-spin" size={16} /> : <Upload size={16} />}Enviar foto</Button></form></Card>
      <PhotoComparison photos={orderedPhotos} comparison={comparison} setComparison={setComparison} chosen={chosenPhotos} />
    </div>
    {orderedWeights.length > 0 && <Card className="overflow-hidden"><div className="flex items-center justify-between px-5 py-4 sm:px-6"><div><p className="text-sm font-semibold">Últimos registros</p><p className="mt-1 text-xs text-muted">Seu histórico fica disponível para você e seu coach.</p></div><span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-muted">{orderedWeights.length}</span></div><div className="divide-y divide-border">{[...orderedWeights].reverse().slice(0, 8).map((item) => <div key={item.id} className="flex items-center gap-4 px-5 py-3.5 sm:px-6"><span className="grid size-9 place-items-center rounded-xl bg-brand-deep/35 text-brand"><Scale size={16} /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{formatDate(item.recordedAt)}</p>{item.note && <p className="mt-0.5 truncate text-xs text-muted">{item.note}</p>}</div><strong className="text-sm">{item.weightKg.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} kg</strong></div>)}</div></Card>}
  </div>;
}

function Stat({ icon: Icon, label, value, detail, positive }: { icon: typeof Scale; label: string; value: string; detail: string; positive?: boolean }) { return <Card className="p-5"><div className="flex items-center justify-between"><span className="text-xs text-muted">{label}</span><Icon size={17} className="text-brand" /></div><strong className={cn("mt-4 block text-2xl font-semibold tracking-tight", positive && "text-brand")}>{value}</strong><p className="mt-1 text-xs text-muted">{detail}</p></Card>; }

function PrescriptionCard({ prescription }: { prescription: ClientProgress["prescriptions"][number] }) { return <Card className="overflow-hidden"><div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-deep/45 text-brand"><Sparkles size={21} /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand">Plano alimentar ativo{prescription.coachName ? ` · ${prescription.coachName}` : ""}</p><h2 className="mt-1 text-lg font-semibold">{prescription.title}</h2><p className="mt-1 text-sm leading-6 text-muted">{prescription.instructions || "Metas definidas para sua rotina atual."}</p></div><div className="grid grid-cols-4 gap-2 text-center"><Macro value={prescription.calories} unit="kcal" label="Energia" /><Macro value={prescription.proteinG} unit="g" label="Proteína" /><Macro value={prescription.carbohydratesG} unit="g" label="Carbo" /><Macro value={prescription.fatG} unit="g" label="Gordura" /></div></div></Card>; }
function Macro({ value, unit, label }: { value: number; unit: string; label: string }) { return <div className="min-w-14 rounded-xl bg-white/[.035] px-2 py-2"><strong className="block text-sm">{value}{unit}</strong><span className="mt-1 block text-[10px] text-muted">{label}</span></div>; }

function PhotoComparison({ photos, comparison, setComparison, chosen }: { photos: ProgressPhoto[]; comparison: [number, number]; setComparison: (value: [number, number]) => void; chosen: [ProgressPhoto | undefined, ProgressPhoto | undefined] }) {
  const change = (position: 0 | 1, direction: -1 | 1) => { const next = Math.max(0, Math.min(photos.length - 1, comparison[position] + direction)); setComparison(position === 0 ? [next, comparison[1]] : [comparison[0], next]); };
  return <Card className="p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand">Comparativo visual</p><h2 className="mt-2 text-xl font-semibold">Veja a transformação</h2></div><Camera className="text-muted" size={19} /></div>{photos.length === 0 ? <div className="grid min-h-72 place-items-center text-center"><div><Camera className="mx-auto text-muted" size={24} /><p className="mt-3 text-sm font-medium">Seu comparativo começa aqui</p><p className="mt-1 text-xs text-muted">Adicione fotos nas mesmas condições para observar mudanças reais.</p></div></div> : <div className="mt-5 grid gap-4 sm:grid-cols-2">{chosen.map((photo, index) => <div key={`${photo?.id}-${index}`} className="overflow-hidden rounded-2xl border border-border bg-white/[.02]"><div className="aspect-[3/4] bg-gradient-to-br from-brand-deep/70 via-surface-raised to-[#28332c]">{photo?.url ? <img src={photo.url} alt={photo.label || `Registro de ${formatDate(photo.takenAt)}`} className="size-full object-cover" /> : <div className="grid size-full place-items-center"><Camera className="text-brand/70" size={28} /></div>}</div><div className="flex items-center justify-between gap-2 p-3"><button aria-label="Foto anterior" onClick={() => change(index as 0 | 1, -1)} disabled={comparison[index] === 0} className="grid size-8 place-items-center rounded-lg border border-border text-muted disabled:opacity-30"><ChevronLeft size={15} /></button><span className="min-w-0 text-center"><strong className="block truncate text-xs">{photo?.label || (index === 0 ? "Antes" : "Depois")}</strong><small className="block text-[10px] text-muted">{photo ? formatDate(photo.takenAt) : "—"}</small></span><button aria-label="Próxima foto" onClick={() => change(index as 0 | 1, 1)} disabled={comparison[index] >= photos.length - 1} className="grid size-8 place-items-center rounded-lg border border-border text-muted disabled:opacity-30"><ChevronRight size={15} /></button></div></div>)}</div>}</Card>;
}
