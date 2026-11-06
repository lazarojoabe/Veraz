import { cn } from "@/lib/utils";

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)} aria-label="VERAZ">
      <span className="grid size-9 rotate-45 place-items-center rounded-[10px] border border-brand/40 bg-brand-deep text-brand shadow-[inset_0_0_0_1px_rgba(67,201,130,.08)]">
        <span className="-rotate-45 text-sm font-black tracking-[-0.12em]">V</span>
      </span>
      {!compact && <span className="text-[17px] font-bold tracking-[0.28em] text-foreground">VERAZ</span>}
    </div>
  );
}
