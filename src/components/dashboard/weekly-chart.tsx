"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function WeeklyChart({ data }: { data: { day: string; value: number }[] }) {
  return (
    <div className="h-[200px] w-full" aria-label="Gráfico de calorias consumidas nos últimos sete dias">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="calorieGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#43c982" stopOpacity={0.24} />
              <stop offset="95%" stopColor="#43c982" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#78847d", fontSize: 11 }} dy={8} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#657169", fontSize: 10 }} tickFormatter={(value) => `${value / 1000}k`} />
          <Tooltip
            cursor={{ stroke: "#314139", strokeDasharray: "4 4" }}
            contentStyle={{ background: "#171c19", border: "1px solid #2b352f", borderRadius: 12, color: "#f0f3f1", fontSize: 12 }}
            formatter={(value) => [`${Number(value).toLocaleString("pt-BR")} kcal`, "Consumo"]}
          />
          <Area type="monotone" dataKey="value" stroke="#43c982" strokeWidth={2.2} fill="url(#calorieGradient)" activeDot={{ r: 4, fill: "#43c982", stroke: "#0b0e0d", strokeWidth: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
