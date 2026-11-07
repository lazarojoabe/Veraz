import { createClient } from "@/lib/supabase/server";
import { getGoals } from "@/repositories/goals.repository";
import type { DashboardData } from "@/types/dashboard";
import { addDaysToDayKey, appDayKey, appDayKeyOffset, dayKeyAsDate, formatAppDate, startOfAppDayIso } from "@/lib/dates/app-timezone";

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient();
  const firstDay = appDayKeyOffset(-6);

  const [{ data: profile }, goals, mealsResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).single(),
    getGoals(userId),
    supabase
      .from("meals")
      .select("id,name,eaten_at,calories_total,protein_total_g,carbohydrates_total_g,fat_total_g,meal_items(food_name,position)")
      .eq("user_id", userId)
      .gte("eaten_at", startOfAppDayIso(firstDay))
      .order("eaten_at", { ascending: true }),
  ]);
  if (mealsResult.error) throw new Error("Não foi possível carregar o dashboard.");

  type Row = {
    id: string; name: string; eaten_at: string;
    calories_total: number | string; protein_total_g: number | string;
    carbohydrates_total_g: number | string; fat_total_g: number | string;
    meal_items: { food_name: string; position: number }[];
  };
  const rows = mealsResult.data as Row[];
  const today = appDayKey(new Date());
  const todayRows = rows.filter((meal) => appDayKey(meal.eaten_at) === today);
  const sum = (key: "calories_total" | "protein_total_g" | "carbohydrates_total_g" | "fat_total_g") =>
    todayRows.reduce((total, row) => total + Number(row[key]), 0);

  const days = Array.from({ length: 7 }, (_, index) => {
    const key = addDaysToDayKey(firstDay, index);
    return {
      day: formatAppDate(dayKeyAsDate(key), { weekday: "short" }).replace(".", ""),
      key,
      value: rows.filter((meal) => appDayKey(meal.eaten_at) === key).reduce((total, meal) => total + Number(meal.calories_total), 0),
    };
  });
  const recordedDays = new Set(rows.map((meal) => appDayKey(meal.eaten_at)));
  let streak = 0;
  let cursor = today;
  while (recordedDays.has(cursor)) {
    streak += 1;
    cursor = addDaysToDayKey(cursor, -1);
  }

  return {
    displayName: (profile?.display_name as string | undefined) ?? "Você",
    goals,
    today: {
      calories: sum("calories_total"), proteinG: sum("protein_total_g"),
      carbohydratesG: sum("carbohydrates_total_g"), fatG: sum("fat_total_g"),
      meals: todayRows.map((meal) => ({
        id: meal.id, name: meal.name, eatenAt: meal.eaten_at, calories: Number(meal.calories_total),
        summary: meal.meal_items.sort((a, b) => a.position - b.position).slice(0, 3).map((item) => item.food_name).join(", ") || "Registro confirmado",
      })),
    },
    week: days.map(({ day, value }) => ({ day, value })),
    streak,
    mode: "connected",
  };
}
