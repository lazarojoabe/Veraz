import { AppShell } from "@/components/layout/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return <AppShell connected={isSupabaseConfigured()}>{children}</AppShell>;
}
