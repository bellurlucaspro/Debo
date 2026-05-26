"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/utils";

/**
 * Courbe de chiffre d'affaires sur 7 mois (recharts).
 * Montants en centimes ; affichage formaté en euros.
 */
export function RevenueChart({
  data,
  currency,
}: {
  data: { label: string; revenue: number }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#810000" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#810000" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#52616B", fontSize: 11 }}
          dy={8}
        />
        <YAxis hide domain={[0, "dataMax + 1000"]} />
        <Tooltip
          cursor={{ stroke: "#810000", strokeOpacity: 0.2 }}
          contentStyle={{
            background: "#EEEBDD",
            border: "1px solid #C7B198",
            borderRadius: 8,
            fontSize: 12,
            color: "#1E2022",
          }}
          formatter={(value: number) => [formatMoney(value, currency), "CA"]}
          labelStyle={{ color: "#52616B" }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#810000"
          strokeWidth={2.5}
          fill="url(#revFill)"
          dot={{ r: 3, fill: "#810000" }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
