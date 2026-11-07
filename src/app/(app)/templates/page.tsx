import { TemplatesList } from "@/components/templates/templates-list";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function TemplatesPage() {
  return <div className="mx-auto max-w-4xl space-y-7"><header><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">Atalhos pessoais</p><h1 className="text-3xl font-semibold tracking-[-0.04em]">Modelos de refeições</h1><p className="mt-2 text-sm text-muted">Registre combinações recorrentes sem refazer a composição.</p></header><TemplatesList connected={isSupabaseConfigured()} /></div>;
}
