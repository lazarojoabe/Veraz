import type { DashboardData } from "@/types/dashboard";

export const demoDashboard: DashboardData = {
  displayName: "Lazar",
  goals: { calories: 2300, proteinG: 150, carbohydratesG: 240, fatG: 70 },
  today: {
    calories: 1396,
    proteinG: 85,
    carbohydratesG: 163,
    fatG: 43,
    meals: [
      { id: "demo-1", name: "Café da manhã", eatenAt: "2026-11-06T07:42:00-03:00", summary: "Ovos, pão e banana", calories: 418 },
      { id: "demo-2", name: "Almoço", eatenAt: "2026-11-06T12:18:00-03:00", summary: "Arroz, frango e feijão", calories: 692 },
      { id: "demo-3", name: "Lanche", eatenAt: "2026-11-06T16:06:00-03:00", summary: "Banana e aveia", calories: 286 },
    ],
  },
  week: [
    { day: "Seg", value: 1870 }, { day: "Ter", value: 2130 }, { day: "Qua", value: 1960 },
    { day: "Qui", value: 2240 }, { day: "Sex", value: 1396 }, { day: "Sáb", value: 0 }, { day: "Dom", value: 0 },
  ],
  streak: 5,
  mode: "demo",
};
