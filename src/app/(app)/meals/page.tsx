import Link from "next/link";
import { AudioLines, Keyboard, Mic, Plus, Search, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// A seleção da aba depende da URL recebida; o shell continua rápido e esta rota pode bloquear no servidor.
export const instant = false;

export default async function MealsPage({ searchParams }: PageProps<"/meals">) {
  const params = await searchParams;
  const mode = params.mode === "manual" ? "manual" : "voice";

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">Novo registro</p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">Adicionar refeição</h1>
        <p className="mt-2 text-sm text-muted">Escolha a forma mais simples para registrar o que você comeu.</p>
      </header>

      <div className="grid grid-cols-2 rounded-xl border border-border bg-surface p-1">
        <Link href="/meals?mode=voice" className={cn("flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors", mode === "voice" ? "bg-brand-deep text-brand" : "text-muted hover:text-foreground")}><AudioLines size={17} /> Por voz</Link>
        <Link href="/meals?mode=manual" className={cn("flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors", mode === "manual" ? "bg-brand-deep text-brand" : "text-muted hover:text-foreground")}><Keyboard size={17} /> Manual</Link>
      </div>

      {mode === "voice" ? <VoicePanel /> : <ManualPanel />}
    </div>
  );
}

function VoicePanel() {
  return (
    <Card className="relative overflow-hidden p-6 text-center sm:p-10">
      <div className="absolute left-1/2 top-24 size-56 -translate-x-1/2 rounded-full bg-brand-strong/10 blur-3xl" />
      <div className="relative">
        <span className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-deep/30 px-3 py-1.5 text-[11px] font-medium text-brand"><Sparkles size={13} /> Transcrição inteligente</span>
        <button className="mx-auto grid size-28 place-items-center rounded-full border-[7px] border-brand-deep bg-brand text-[#07110c] shadow-[0_15px_55px_rgba(67,201,130,.2)] transition-transform hover:scale-[1.03]" aria-label="Iniciar gravação" disabled title="Disponível na Fase 3">
          <Mic size={36} strokeWidth={2.2} />
        </button>
        <h2 className="mt-7 text-xl font-semibold">Toque para começar</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Diga os alimentos, quantidades e preparo. Exemplo: “150 gramas de arroz e 120 gramas de frango grelhado”.</p>
        <div className="mx-auto mt-7 flex max-w-md items-center justify-between rounded-xl border border-border bg-white/[0.025] px-4 py-3 text-xs text-muted"><span>Tempo máximo</span><strong className="font-medium text-foreground">00:30</strong></div>
        <p className="mt-4 text-[11px] text-muted/65">A captura e a transcrição serão habilitadas na Fase 3.</p>
      </div>
    </Card>
  );
}

function ManualPanel() {
  return (
    <Card className="p-5 sm:p-7">
      <label className="block"><span className="mb-2 block text-xs font-medium text-muted">Buscar alimento</span><span className="flex h-12 items-center gap-3 rounded-xl border border-border bg-white/[0.025] px-3"><Search size={18} className="text-muted" /><input className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/45" placeholder="Ex.: arroz integral, banana, peito de frango…" disabled /></span></label>
      <div className="mt-6 rounded-2xl border border-dashed border-border px-5 py-12 text-center"><span className="mx-auto grid size-11 place-items-center rounded-xl bg-white/5 text-muted"><Plus size={19} /></span><p className="mt-4 text-sm font-medium">Sua refeição começa aqui</p><p className="mt-1.5 text-xs text-muted">A pesquisa nutricional será conectada na Fase 2.</p></div>
    </Card>
  );
}
