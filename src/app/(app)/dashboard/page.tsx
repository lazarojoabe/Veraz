import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { demoDashboard } from "@/data/dashboard";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function DashboardPage() {
  return <DashboardOverview initialData={demoDashboard} connected={isSupabaseConfigured()} />;
}
