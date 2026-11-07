export type DashboardMeal = {
  id: string;
  name: string;
  eatenAt: string;
  summary: string;
  calories: number;
};

export type DashboardData = {
  displayName: string;
  goals: { calories: number; proteinG: number; carbohydratesG: number; fatG: number };
  today: { calories: number; proteinG: number; carbohydratesG: number; fatG: number; meals: DashboardMeal[] };
  week: { day: string; value: number }[];
  streak: number;
  mode: "demo" | "connected";
};
