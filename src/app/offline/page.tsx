import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Brand } from "@/components/brand";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 text-center">
        <Brand className="mb-10 justify-center" />
        <span className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-white/5 text-muted">
          <WifiOff aria-hidden="true" size={24} />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Você está offline</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Seus dados não serão alterados. Reconecte-se para sincronizar e registrar novas refeições.
        </p>
        <Link className="mt-7 inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-[#07110c]" href="/dashboard">
          Tentar novamente
        </Link>
      </section>
    </main>
  );
}
