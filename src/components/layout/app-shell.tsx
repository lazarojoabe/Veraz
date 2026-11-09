"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Clock3,
  Dumbbell,
  LayoutDashboard,
  Mic,
  Rows3,
  Settings,
  Utensils,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { cn } from "@/lib/utils";
import { demoDashboard } from "@/data/dashboard";
import type { DashboardData } from "@/types/dashboard";

const navigation = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/meals", label: "Refeições", icon: Utensils },
  { href: "/history", label: "Histórico", icon: Clock3 },
  { href: "/templates", label: "Modelos", icon: Rows3 },
  { href: "/training", label: "Treinos", icon: Dumbbell },
  { href: "/settings", label: "Metas e ajustes", icon: Settings },
];

const mobileNavigation = navigation.filter((item) => ["/dashboard", "/meals", "/training", "/settings"].includes(item.href));

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("pt-BR") || "V";
}

export function AppShell({ children, connected }: { children: React.ReactNode; connected: boolean }) {
  const pathname = usePathname();
  const [summary, setSummary] = useState({ displayName: connected ? "Você" : demoDashboard.displayName, streak: connected ? 0 : demoDashboard.streak });

  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    void fetch("/api/dashboard", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<DashboardData>;
      })
      .then((data) => setSummary({ displayName: data.displayName, streak: data.streak }))
      .catch(() => undefined);
    return () => controller.abort();
  }, [connected]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-border bg-[#0c100e]/95 p-5 backdrop-blur lg:flex">
        <Brand className="h-12 px-2" />

        <nav className="mt-10 space-y-1" aria-label="Navegação principal">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted/65">Seu acompanhamento</p>
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = isCurrent(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                  active ? "bg-brand-deep/80 text-brand" : "text-muted hover:bg-white/[0.035] hover:text-foreground",
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                <span>{label}</span>
                {active && <span className="ml-auto size-1.5 rounded-full bg-brand" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-brand/15 bg-brand-deep/25 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Sequência atual</span>
            <CalendarDays className="text-brand" size={16} aria-hidden="true" />
          </div>
          <div className="flex items-end gap-2">
            <strong className="text-3xl font-semibold tracking-tight">{summary.streak}</strong>
            <span className="pb-1 text-xs text-muted">dias registrando</span>
          </div>
          <div className="mt-4 flex gap-1.5" aria-label={`${Math.min(summary.streak, 7)} dos últimos sete dias registrados`}>
            {Array.from({ length: 7 }, (_, index) => index < Math.min(summary.streak, 7)).map((done, index) => (
              <span key={index} className={cn("h-1 flex-1 rounded-full", done ? "bg-brand" : "bg-white/10")} />
            ))}
          </div>
        </div>

        <Link href="/settings" className="mt-4 flex items-center gap-3 rounded-xl p-2 hover:bg-white/[0.035]">
          <span className="grid size-9 place-items-center rounded-full bg-[#26332c] text-xs font-bold text-brand">{initials(summary.displayName)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{summary.displayName}</span>
            <span className="block text-xs text-muted">Conta pessoal</span>
          </span>
          <ChevronRight size={15} className="text-muted" aria-hidden="true" />
        </Link>
      </aside>

      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/75 bg-background/80 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <Brand className="lg:hidden" />
          <div className="hidden lg:block">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Seu esforço. Sua evolução.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-brand/20 bg-brand-deep/30 px-3 py-1.5 text-[11px] font-medium text-brand sm:inline-flex">Privado por padrão</span>
            <button className="relative grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-white/5 hover:text-foreground" aria-label="Notificações">
              <Bell size={19} aria-hidden="true" />
              <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-brand" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-7 sm:px-7 lg:px-10 lg:pb-10 lg:pt-9">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[#0c100e]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Navegação móvel">
        <div className="grid h-16 grid-cols-5 items-center px-2">
          {mobileNavigation.slice(0, 2).map(({ href, label, icon: Icon }) => {
            const active = isCurrent(pathname, href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex h-full flex-col items-center justify-center gap-1 text-[10px]", active ? "text-brand" : "text-muted")}>
                <Icon size={19} aria-hidden="true" /><span>{label === "Visão geral" ? "Início" : label}</span>
              </Link>
            );
          })}
          <Link href="/meals?mode=voice" aria-label="Registrar refeição por voz" className="mx-auto grid size-12 -translate-y-3 place-items-center rounded-2xl bg-brand text-[#07110c] shadow-[0_8px_28px_rgba(67,201,130,.2)]">
            <Mic size={22} strokeWidth={2.4} aria-hidden="true" />
          </Link>
          {mobileNavigation.slice(2).map(({ href, label, icon: Icon }) => {
            const active = isCurrent(pathname, href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex h-full flex-col items-center justify-center gap-1 text-[10px]", active ? "text-brand" : "text-muted")}>
                <Icon size={19} aria-hidden="true" /><span>{label === "Metas e ajustes" ? "Ajustes" : label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
