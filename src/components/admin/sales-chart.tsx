"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatLKR } from "@/lib/money";

/** Revenue per day as bars. Amounts are integer cents. */
export function SalesChart({
  days,
}: {
  days: { day: string; revenueCents: number; orders: number }[];
}) {
  const data = days.map((d) => ({
    label: new Intl.DateTimeFormat("en-LK", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${d.day}T00:00:00Z`)),
    rupees: d.revenueCents / 100,
    orders: d.orders,
  }));
  return (
    <div className="h-72 w-full" role="img" aria-label="Revenue per day">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            width={64}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <Tooltip
            formatter={(value) => [formatLKR(Math.round(Number(value) * 100)), "Revenue"]}
            labelStyle={{ color: "var(--foreground)" }}
            contentStyle={{ borderRadius: 12, borderColor: "var(--border)" }}
          />
          <Bar dataKey="rupees" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
