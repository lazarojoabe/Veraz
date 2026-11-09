"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { io } from "next/cache";
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  Check,
  ChevronRight,
  Dumbbell,
  History,
  Layers3,
  LoaderCircle,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { demoExercises, demoPlans, demoSessions } from "@/data/training";
import { buildTrainingProgress, calculateWorkoutTotals } from "@/lib/training/calculations";
import { cn } from "@/lib/utils";
import { muscleGroupLabels, muscleGroups, type Exercise, type MuscleGroup, type WorkoutPlan, type WorkoutSession, type WorkoutSet } from "@/types/training";

type Tab = "overview" | "plans" | "record" | "progress";
type PlanExerciseDraft = { exerciseId: string; targetSets: number; targetReps: number; restSeconds: number };
type SessionExerciseDraft = { exerciseId: string; sets: WorkoutSet[] };
type LocalWorkspace = { exercises: Exercise[]; plans: WorkoutPlan[]; sessions: WorkoutSession[] };

const storageKey = "veraz.training.workspace.v1";
const fieldClass = "h-11 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-brand/55";
const compactFieldClass = "h-10 rounded-xl border border-border bg-surface-raised px-3 text-sm text-foreground outline-none focus:border-brand/55";

const tabs: Array<{ id: Tab; label: string; icon: typeof Activity }> = [
  { id: "overview", label: "Visão geral", icon: Activity },
  { id: "plans", label: "Fichas", icon: BookOpenCheck },
  { id: "record", label: "Registrar", icon: Dumbbell },
  { id: "progress", label: "Progresso", icon: BarChart3 },
];

function asLocalDateTime(value = new Date()) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function formatNumber(value: number, maximumFractionDigits = 0) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between"><span className="text-xs font-medium text-muted">{label}</span><Icon size={17} className="text-brand" aria-hidden="true" /></div>
      <strong className="mt-4 block text-2xl font-semibold tracking-[-0.04em]">{value}</strong>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </Card>
  );
}

export function TrainingHub({ connected }: { connected: boolean }) {
  use(io());
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [exercises, setExercises] = useState<Exercise[]>(demoExercises);
  const [plans, setPlans] = useState<WorkoutPlan[]>(demoPlans);
  const [sessions, setSessions] = useState<WorkoutSession[]>(demoSessions);
  const [loading, setLoading] = useState(connected);
  const [hydrated, setHydrated] = useState(false);
  const [referenceTime] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [exerciseName, setExerciseName] = useState("");
  const [exerciseMuscle, setExerciseMuscle] = useState<MuscleGroup>("chest");
  const [exerciseEquipment, setExerciseEquipment] = useState("");
  const [exerciseTracking, setExerciseTracking] = useState<Exercise["trackingType"]>("weight_reps");

  const [planName, setPlanName] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planExercisePicker, setPlanExercisePicker] = useState(demoExercises[0]?.id ?? "");
  const [planExercises, setPlanExercises] = useState<PlanExerciseDraft[]>([]);

  const [workoutPlanId, setWorkoutPlanId] = useState("");
  const [workoutName, setWorkoutName] = useState("");
  const [workoutDate, setWorkoutDate] = useState(() => asLocalDateTime());
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [workoutExercises, setWorkoutExercises] = useState<SessionExerciseDraft[]>([]);

  const [period, setPeriod] = useState<30 | 90 | 365>(90);
  const [selectedProgressExercise, setSelectedProgressExercise] = useState("");

  const loadConnected = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [exerciseResponse, planResponse, sessionResponse] = await Promise.all([
        fetch("/api/training/exercises"),
        fetch("/api/training/plans"),
        fetch("/api/training/sessions?period=365"),
      ]);
      if (!exerciseResponse.ok || !planResponse.ok || !sessionResponse.ok) throw new Error();
      const [exercisePayload, planPayload, sessionPayload] = await Promise.all([
        exerciseResponse.json() as Promise<{ exercises: Exercise[] }>,
        planResponse.json() as Promise<{ plans: WorkoutPlan[] }>,
        sessionResponse.json() as Promise<{ sessions: WorkoutSession[] }>,
      ]);
      setExercises(exercisePayload.exercises);
      setPlans(planPayload.plans);
      setSessions(sessionPayload.sessions);
      setPlanExercisePicker((current) => current || exercisePayload.exercises[0]?.id || "");
    } catch {
      setError("Não foi possível carregar seus dados de treino.");
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (connected) {
        void loadConnected();
        return;
      }
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored) {
          const workspace = JSON.parse(stored) as LocalWorkspace;
          if (workspace.exercises?.length) setExercises(workspace.exercises);
          if (Array.isArray(workspace.plans)) setPlans(workspace.plans);
          if (Array.isArray(workspace.sessions)) setSessions(workspace.sessions);
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      } finally {
        setHydrated(true);
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [connected, loadConnected]);

  useEffect(() => {
    if (!connected && hydrated) {
      window.localStorage.setItem(storageKey, JSON.stringify({ exercises, plans, sessions } satisfies LocalWorkspace));
    }
  }, [connected, exercises, hydrated, plans, sessions]);

  const filteredSessions = useMemo(() => {
    const since = referenceTime - period * 86_400_000;
    return sessions.filter((session) => Date.parse(session.performedAt) >= since);
  }, [period, referenceTime, sessions]);
  const progress = useMemo(() => buildTrainingProgress(filteredSessions), [filteredSessions]);
  const progressExercise = progress.exerciseProgress.find((item) => item.exerciseId === selectedProgressExercise) ?? progress.exerciseProgress[0] ?? null;
  const recentSessions = [...sessions].sort((a, b) => Date.parse(b.performedAt) - Date.parse(a.performedAt)).slice(0, 4);

  function showSuccess(value: string) {
    setMessage(value);
    setError(null);
    window.setTimeout(() => setMessage(null), 4000);
  }

  async function saveExercise() {
    if (exerciseName.trim().length < 2) { setError("Informe um nome válido para o exercício."); return; }
    setBusy(true); setError(null);
    const input = { name: exerciseName.trim(), muscleGroup: exerciseMuscle, equipment: exerciseEquipment.trim() || null, trackingType: exerciseTracking };
    try {
      let exercise: Exercise;
      if (connected) {
        const response = await fetch("/api/training/exercises", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
        if (!response.ok) throw new Error();
        exercise = ((await response.json()) as { exercise: Exercise }).exercise;
      } else {
        exercise = { id: crypto.randomUUID(), ...input, isCustom: true };
      }
      setExercises((current) => [...current, exercise].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setPlanExercisePicker(exercise.id);
      setExerciseName(""); setExerciseEquipment("");
      showSuccess("Exercício cadastrado e disponível para suas fichas.");
    } catch { setError("Não foi possível cadastrar o exercício."); }
    finally { setBusy(false); }
  }

  function addPlanExercise() {
    if (!planExercisePicker || planExercises.some((item) => item.exerciseId === planExercisePicker)) return;
    setPlanExercises((current) => [...current, { exerciseId: planExercisePicker, targetSets: 3, targetReps: 10, restSeconds: 90 }]);
  }

  function updatePlanExercise(index: number, field: keyof Omit<PlanExerciseDraft, "exerciseId">, value: number) {
    setPlanExercises((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  async function savePlan() {
    if (planName.trim().length < 2 || planExercises.length === 0) { setError("Dê um nome à ficha e adicione ao menos um exercício."); return; }
    const input = { name: planName.trim(), description: planDescription.trim(), exercises: planExercises };
    setBusy(true); setError(null);
    try {
      if (connected) {
        const response = await fetch("/api/training/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
        if (!response.ok) throw new Error();
        await loadConnected();
      } else {
        const plan: WorkoutPlan = {
          id: crypto.randomUUID(), name: input.name, description: input.description || null, createdAt: new Date().toISOString(),
          exercises: input.exercises.map((item, position) => {
            const exercise = exercises.find((candidate) => candidate.id === item.exerciseId)!;
            return { ...item, position, exerciseName: exercise.name, muscleGroup: exercise.muscleGroup, equipment: exercise.equipment };
          }),
        };
        setPlans((current) => [plan, ...current]);
      }
      setPlanName(""); setPlanDescription(""); setPlanExercises([]);
      showSuccess("Ficha criada. Ela já pode ser usada para registrar um treino.");
    } catch { setError("Não foi possível criar a ficha."); }
    finally { setBusy(false); }
  }

  function startPlan(planId: string) {
    const plan = plans.find((item) => item.id === planId);
    setWorkoutPlanId(planId);
    if (!plan) { setWorkoutName(""); setWorkoutExercises([]); return; }
    setWorkoutName(plan.name);
    setWorkoutExercises(plan.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      sets: Array.from({ length: exercise.targetSets }, () => ({ weightKg: 0, reps: exercise.targetReps })),
    })));
  }

  function updateSet(exerciseIndex: number, setIndex: number, field: keyof WorkoutSet, value: number) {
    setWorkoutExercises((current) => current.map((exercise, currentExerciseIndex) => currentExerciseIndex === exerciseIndex ? {
      ...exercise,
      sets: exercise.sets.map((set, currentSetIndex) => currentSetIndex === setIndex ? { ...set, [field]: value } : set),
    } : exercise));
  }

  function addSet(exerciseIndex: number) {
    setWorkoutExercises((current) => current.map((exercise, index) => {
      if (index !== exerciseIndex) return exercise;
      const last = exercise.sets.at(-1) ?? { weightKg: 0, reps: 10 };
      return { ...exercise, sets: [...exercise.sets, { ...last }] };
    }));
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    setWorkoutExercises((current) => current.map((exercise, index) => index === exerciseIndex ? { ...exercise, sets: exercise.sets.filter((_, currentSetIndex) => currentSetIndex !== setIndex) } : exercise));
  }

  async function saveWorkout() {
    if (!workoutPlanId || !workoutName || workoutExercises.length === 0 || workoutExercises.some((exercise) => exercise.sets.length === 0 || exercise.sets.some((set) => set.weightKg < 0 || set.reps < 1))) {
      setError("Selecione uma ficha e preencha ao menos uma série válida por exercício."); return;
    }
    const input = { planId: workoutPlanId, name: workoutName, performedAt: new Date(workoutDate).toISOString(), notes: workoutNotes.trim(), exercises: workoutExercises };
    setBusy(true); setError(null);
    try {
      if (connected) {
        const response = await fetch("/api/training/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
        if (!response.ok) throw new Error();
        await loadConnected();
      } else {
        const plan = plans.find((item) => item.id === workoutPlanId)!;
        const sessionExercises = workoutExercises.map((item) => {
          const exercise = exercises.find((candidate) => candidate.id === item.exerciseId)!;
          return { exerciseId: item.exerciseId, exerciseName: exercise.name, muscleGroup: exercise.muscleGroup, equipment: exercise.equipment, sets: item.sets };
        });
        const session: WorkoutSession = { id: crypto.randomUUID(), planId: plan.id, name: input.name, performedAt: input.performedAt, notes: input.notes || null, ...calculateWorkoutTotals(sessionExercises), exercises: sessionExercises };
        setSessions((current) => [session, ...current]);
      }
      setWorkoutNotes(""); setWorkoutDate(asLocalDateTime());
      startPlan(workoutPlanId);
      showSuccess("Treino registrado. Seu progresso já foi atualizado.");
      setActiveTab("progress");
    } catch { setError("Não foi possível registrar o treino."); }
    finally { setBusy(false); }
  }

  if (loading) return <Card className="grid min-h-[420px] place-items-center"><div className="text-center"><LoaderCircle className="mx-auto animate-spin text-brand" /><p className="mt-3 text-sm text-muted">Carregando treinos…</p></div></Card>;

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex min-w-full gap-1 rounded-2xl border border-border bg-surface p-1 sm:min-w-0" role="tablist" aria-label="Áreas de treino">
          {tabs.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={cn("flex h-11 min-w-28 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition-colors", activeTab === id ? "bg-brand text-[#07110c]" : "text-muted hover:bg-white/5 hover:text-foreground")}><Icon size={16} />{label}</button>)}
        </div>
      </div>

      {!connected && <div className="flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand-deep/25 px-4 py-3 text-xs leading-5 text-muted"><Save size={16} className="mt-0.5 shrink-0 text-brand" /><span><strong className="text-foreground">Modo local ativo.</strong> Exercícios, fichas e treinos ficam salvos neste navegador. Ao conectar o Supabase, passam a ficar protegidos na sua conta.</span></div>}
      {message && <div className="flex items-center gap-2 rounded-xl border border-brand/25 bg-brand-deep/30 px-4 py-3 text-sm text-brand" role="status"><Check size={16} />{message}</div>}
      {error && <div className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">{error}</div>}

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Dumbbell} label="Treinos" value={formatNumber(progress.totalWorkouts)} detail={`nos últimos ${period} dias`} />
            <Metric icon={Layers3} label="Volume total" value={`${formatNumber(progress.totalVolumeKg / 1000, 1)} t`} detail="carga externa movimentada" />
            <Metric icon={Target} label="Séries concluídas" value={formatNumber(progress.totalSets)} detail="somando todos os exercícios" />
            <Metric icon={TrendingUp} label="Semanas ativas" value={formatNumber(progress.activeWeeks)} detail="com pelo menos um treino" />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Continuar evoluindo</p><h2 className="mt-2 text-xl font-semibold tracking-tight">Inicie pela sua ficha</h2></div><Sparkles className="text-brand" size={20} /></div>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted">Escolha uma ficha, informe peso e repetições de cada série e finalize. Os gráficos são recalculados automaticamente.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {plans.slice(0, 2).map((plan) => <button key={plan.id} onClick={() => { startPlan(plan.id); setActiveTab("record"); }} className="group rounded-2xl border border-border bg-white/[0.025] p-4 text-left transition-colors hover:border-brand/35 hover:bg-brand-deep/20"><div className="flex items-center justify-between"><strong className="text-sm">{plan.name}</strong><ChevronRight size={16} className="text-muted group-hover:text-brand" /></div><p className="mt-2 text-xs text-muted">{plan.exercises.length} exercícios · {plan.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0)} séries planejadas</p></button>)}
              </div>
            </Card>
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Treinos recentes</h2><History size={17} className="text-muted" /></div>
              <div className="mt-4 divide-y divide-border">
                {recentSessions.length === 0 && <p className="py-8 text-center text-xs text-muted">Seu histórico aparecerá aqui.</p>}
                {recentSessions.map((session) => <div key={session.id} className="flex items-center gap-3 py-3"><span className="grid size-9 place-items-center rounded-xl bg-brand-deep/35 text-brand"><Dumbbell size={15} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{session.name}</p><p className="mt-0.5 text-xs text-muted">{formatDate(session.performedAt)} · {session.setsCount} séries</p></div><strong className="text-xs">{formatNumber(session.volumeKg)} kg</strong></div>)}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "plans" && (
        <div className="grid gap-6 xl:grid-cols-[.82fr_1.18fr]">
          <div className="space-y-6">
            <Card className="p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Catálogo pessoal</p>
              <h2 className="mt-2 text-xl font-semibold">Cadastrar exercício</h2>
              <div className="mt-5 space-y-3">
                <label className="block text-xs text-muted">Nome<input className={cn(fieldClass, "mt-1.5")} value={exerciseName} onChange={(event) => setExerciseName(event.target.value)} placeholder="Ex.: Remada unilateral" /></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs text-muted">Grupo muscular<select className={cn(fieldClass, "mt-1.5")} value={exerciseMuscle} onChange={(event) => setExerciseMuscle(event.target.value as MuscleGroup)}>{muscleGroups.map((group) => <option key={group} value={group}>{muscleGroupLabels[group]}</option>)}</select></label>
                  <label className="block text-xs text-muted">Equipamento<input className={cn(fieldClass, "mt-1.5")} value={exerciseEquipment} onChange={(event) => setExerciseEquipment(event.target.value)} placeholder="Halter, máquina…" /></label>
                </div>
                <label className="block text-xs text-muted">Forma de registro<select className={cn(fieldClass, "mt-1.5")} value={exerciseTracking} onChange={(event) => setExerciseTracking(event.target.value as Exercise["trackingType"])}><option value="weight_reps">Peso e repetições</option><option value="bodyweight_reps">Peso corporal e repetições</option></select></label>
                <Button className="w-full" onClick={saveExercise} disabled={busy}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}Cadastrar exercício</Button>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Suas fichas</p><h2 className="mt-2 text-xl font-semibold">Prontas para treinar</h2></div><span className="rounded-full bg-white/5 px-3 py-1 text-xs text-muted">{plans.length}</span></div>
              <div className="mt-4 space-y-3">
                {plans.map((plan) => <div key={plan.id} className="rounded-2xl border border-border bg-white/[0.02] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{plan.name}</h3><p className="mt-1 text-xs text-muted">{plan.description || "Ficha personalizada"}</p></div><button onClick={() => { startPlan(plan.id); setActiveTab("record"); }} className="shrink-0 rounded-xl bg-brand-deep/45 px-3 py-2 text-xs font-semibold text-brand hover:bg-brand-deep">Usar ficha</button></div><div className="mt-3 flex flex-wrap gap-1.5">{plan.exercises.map((exercise) => <span key={exercise.exerciseId} className="rounded-lg bg-white/[0.045] px-2 py-1 text-[11px] text-muted">{exercise.exerciseName} · {exercise.targetSets}×{exercise.targetReps}</span>)}</div></div>)}
              </div>
            </Card>
          </div>

          <Card className="self-start p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Nova ficha</p>
            <h2 className="mt-2 text-xl font-semibold">Monte seu treino</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Defina a ordem, o número de séries e a meta de repetições de cada exercício.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-muted">Nome da ficha<input className={cn(fieldClass, "mt-1.5")} value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder="Ex.: Treino A · Superiores" /></label>
              <label className="block text-xs text-muted">Descrição<input className={cn(fieldClass, "mt-1.5")} value={planDescription} onChange={(event) => setPlanDescription(event.target.value)} placeholder="Objetivo ou divisão" /></label>
            </div>
            <div className="mt-4 flex gap-2"><select aria-label="Exercício para adicionar" className={cn(fieldClass, "min-w-0 flex-1")} value={planExercisePicker} onChange={(event) => setPlanExercisePicker(event.target.value)}>{exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name} · {muscleGroupLabels[exercise.muscleGroup]}</option>)}</select><Button variant="secondary" onClick={addPlanExercise}><Plus size={16} />Adicionar</Button></div>
            <div className="mt-5 space-y-3">
              {planExercises.length === 0 && <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center"><Dumbbell size={20} className="mx-auto text-muted" /><p className="mt-3 text-sm font-medium">Nenhum exercício adicionado</p><p className="mt-1 text-xs text-muted">Use o seletor acima para montar a ficha.</p></div>}
              {planExercises.map((item, index) => {
                const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
                return <div key={item.exerciseId} className="rounded-2xl border border-border bg-white/[0.02] p-4"><div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-deep/45 text-xs font-bold text-brand">{index + 1}</span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold">{exercise?.name}</h3><p className="mt-1 text-xs text-muted">{exercise ? muscleGroupLabels[exercise.muscleGroup] : "Exercício"} · {exercise?.equipment || "Sem equipamento"}</p></div><button onClick={() => setPlanExercises((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="p-2 text-muted hover:text-danger" aria-label={`Remover ${exercise?.name}`}><Trash2 size={15} /></button></div><div className="mt-4 grid grid-cols-3 gap-2"><label className="text-[11px] text-muted">Séries<input type="number" min="1" max="20" className={cn(compactFieldClass, "mt-1 w-full")} value={item.targetSets} onChange={(event) => updatePlanExercise(index, "targetSets", Number(event.target.value))} /></label><label className="text-[11px] text-muted">Repetições<input type="number" min="1" max="1000" className={cn(compactFieldClass, "mt-1 w-full")} value={item.targetReps} onChange={(event) => updatePlanExercise(index, "targetReps", Number(event.target.value))} /></label><label className="text-[11px] text-muted">Descanso (s)<input type="number" min="0" max="3600" className={cn(compactFieldClass, "mt-1 w-full")} value={item.restSeconds} onChange={(event) => updatePlanExercise(index, "restSeconds", Number(event.target.value))} /></label></div></div>;
              })}
            </div>
            <Button className="mt-5 w-full" onClick={savePlan} disabled={busy}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}Salvar ficha</Button>
          </Card>
        </div>
      )}

      {activeTab === "record" && (
        <div className="mx-auto max-w-5xl space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end"><label className="min-w-0 flex-1 text-xs text-muted">Ficha de treino<select className={cn(fieldClass, "mt-1.5")} value={workoutPlanId} onChange={(event) => startPlan(event.target.value)}><option value="">Selecione uma ficha</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label><label className="text-xs text-muted sm:w-56">Data e horário<input type="datetime-local" className={cn(fieldClass, "mt-1.5")} value={workoutDate} onChange={(event) => setWorkoutDate(event.target.value)} /></label></div>
          </Card>
          {!workoutPlanId && <Card className="px-5 py-16 text-center"><Dumbbell className="mx-auto text-muted" size={26} /><h2 className="mt-4 text-lg font-semibold">Escolha uma ficha para começar</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">As séries planejadas serão carregadas para você preencher somente peso e repetições.</p><Button className="mt-5" variant="secondary" onClick={() => setActiveTab("plans")}><Plus size={16} />Criar uma ficha</Button></Card>}
          {workoutExercises.map((item, exerciseIndex) => {
            const exercise = exercises.find((candidate) => candidate.id === item.exerciseId);
            return <Card key={item.exerciseId} className="overflow-hidden"><div className="flex items-center gap-3 border-b border-border px-4 py-4 sm:px-5"><span className="grid size-10 place-items-center rounded-xl bg-brand-deep/45 text-brand"><Dumbbell size={17} /></span><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold">{exercise?.name}</h2><p className="mt-1 text-xs text-muted">{exercise ? muscleGroupLabels[exercise.muscleGroup] : "Exercício"} · {exercise?.equipment || "Peso corporal"}</p></div><button onClick={() => addSet(exerciseIndex)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold text-muted hover:text-brand"><Plus size={14} />Série</button></div><div className="p-4 sm:p-5"><div className="mb-2 grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"><span>#</span><span>Peso (kg)</span><span>Repetições</span><span /></div><div className="space-y-2">{item.sets.map((set, setIndex) => <div key={setIndex} className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2"><span className="text-center text-xs font-semibold text-muted">{setIndex + 1}</span><input aria-label={`Peso da série ${setIndex + 1} de ${exercise?.name}`} type="number" min="0" max="2000" step="0.5" inputMode="decimal" className={compactFieldClass} value={set.weightKg} onChange={(event) => updateSet(exerciseIndex, setIndex, "weightKg", Number(event.target.value))} /><input aria-label={`Repetições da série ${setIndex + 1} de ${exercise?.name}`} type="number" min="1" max="1000" inputMode="numeric" className={compactFieldClass} value={set.reps} onChange={(event) => updateSet(exerciseIndex, setIndex, "reps", Number(event.target.value))} /><button onClick={() => removeSet(exerciseIndex, setIndex)} className="grid size-8 place-items-center text-muted hover:text-danger" aria-label={`Remover série ${setIndex + 1}`}><Trash2 size={14} /></button></div>)}</div></div></Card>;
          })}
          {workoutPlanId && <Card className="p-5 sm:p-6"><label className="block text-xs text-muted">Observações<textarea className="mt-1.5 min-h-24 w-full resize-y rounded-xl border border-border bg-surface-raised p-3 text-sm outline-none placeholder:text-muted/60 focus:border-brand/55" value={workoutNotes} onChange={(event) => setWorkoutNotes(event.target.value)} placeholder="Como foi o treino?" /></label><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted">{calculateWorkoutTotals(workoutExercises).setsCount} séries · {formatNumber(calculateWorkoutTotals(workoutExercises).volumeKg)} kg de volume planejado</p><Button onClick={saveWorkout} disabled={busy}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}Concluir treino</Button></div></Card>}
        </div>
      )}

      {activeTab === "progress" && (
        <div className="space-y-6">
          <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"><div className="flex-1"><p className="text-xs text-muted">Visão personalizada</p><p className="mt-1 text-sm font-medium">Filtre o período e o exercício analisado</p></div><label className="text-xs text-muted">Período<select aria-label="Período do progresso" className={cn(compactFieldClass, "ml-2")} value={period} onChange={(event) => setPeriod(Number(event.target.value) as 30 | 90 | 365)}><option value="30">30 dias</option><option value="90">90 dias</option><option value="365">12 meses</option></select></label><label className="text-xs text-muted">Exercício<select aria-label="Exercício do progresso" className={cn(compactFieldClass, "ml-2 max-w-64")} value={progressExercise?.exerciseId ?? ""} onChange={(event) => setSelectedProgressExercise(event.target.value)}>{progress.exerciseProgress.map((item) => <option key={item.exerciseId} value={item.exerciseId}>{item.exerciseName}</option>)}</select></label></Card>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Dumbbell} label="Treinos" value={formatNumber(progress.totalWorkouts)} detail={`últimos ${period} dias`} /><Metric icon={Layers3} label="Volume" value={`${formatNumber(progress.totalVolumeKg / 1000, 1)} t`} detail="carga externa total" /><Metric icon={Target} label="Séries" value={formatNumber(progress.totalSets)} detail="séries registradas" /><Metric icon={TrendingUp} label="1RM estimado" value={progressExercise ? `${formatNumber(progressExercise.bestEstimated1Rm, 1)} kg` : "—"} detail={progressExercise?.exerciseName ?? "sem dados"} /></div>
          {progress.totalWorkouts === 0 ? <Card className="px-5 py-16 text-center"><BarChart3 className="mx-auto text-muted" /><h2 className="mt-4 text-lg font-semibold">Ainda não há dados no período</h2><p className="mt-2 text-sm text-muted">Registre um treino ou amplie o filtro para visualizar sua evolução.</p></Card> : <div className="grid gap-5 xl:grid-cols-2"><Card className="p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Consistência</p><h2 className="mt-2 text-lg font-semibold">Volume por semana</h2></div><BarChart3 size={18} className="text-muted" /></div><div className="mt-6 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={progress.weeklyVolume} margin={{ left: -20, right: 8 }}><CartesianGrid stroke="#263029" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fill: "#8d9a92", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#8d9a92", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#171c19", border: "1px solid #263029", borderRadius: 12, fontSize: 12 }} formatter={(value) => [`${formatNumber(Number(value))} kg`, "Volume"]} /><Bar dataKey="volumeKg" fill="#43c982" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card><Card className="p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Sobrecarga progressiva</p><h2 className="mt-2 text-lg font-semibold">{progressExercise?.exerciseName ?? "Exercício"}</h2></div>{progressExercise?.changePercent != null && <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", progressExercise.changePercent >= 0 ? "bg-brand-deep/50 text-brand" : "bg-danger/10 text-danger")}>{progressExercise.changePercent >= 0 ? "+" : ""}{formatNumber(progressExercise.changePercent, 1)}%</span>}</div><div className="mt-6 h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={progressExercise?.history ?? []} margin={{ left: -20, right: 8 }}><CartesianGrid stroke="#263029" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fill: "#8d9a92", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#8d9a92", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#171c19", border: "1px solid #263029", borderRadius: 12, fontSize: 12 }} formatter={(value, name) => [`${formatNumber(Number(value), 1)} kg`, name === "bestWeightKg" ? "Melhor carga" : "1RM estimado"]} /><Line type="monotone" dataKey="bestWeightKg" stroke="#43c982" strokeWidth={3} dot={{ r: 4, fill: "#43c982" }} /><Line type="monotone" dataKey="estimated1Rm" stroke="#f0f3f1" strokeWidth={2} strokeDasharray="5 5" dot={false} /></LineChart></ResponsiveContainer></div></Card></div>}
          {progress.muscleDistribution.length > 0 && <Card className="p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Distribuição</p><h2 className="mt-2 text-lg font-semibold">Volume por grupo muscular</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{progress.muscleDistribution.map((item) => { const maximum = progress.muscleDistribution[0]?.volumeKg || 1; return <div key={item.muscleGroup}><div className="mb-1.5 flex items-center justify-between text-xs"><span>{item.label}</span><span className="text-muted">{formatNumber(item.volumeKg)} kg</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, item.volumeKg / maximum * 100)}%` }} /></div></div>; })}</div></Card>}
        </div>
      )}
    </div>
  );
}
