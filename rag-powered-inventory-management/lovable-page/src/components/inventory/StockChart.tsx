import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type InventoryItem, type InventorySummary } from "@/data/inventory";

const COLORS = [
  "hsl(173, 58%, 39%)",
  "hsl(215, 28%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(152, 60%, 42%)",
  "hsl(0, 84%, 60%)",
  "hsl(200, 60%, 50%)",
];

interface StockChartProps {
  data: InventoryItem[];
  summary: InventorySummary;
}

export default function StockChart({ data, summary }: StockChartProps) {
  const chartData = useMemo(() => {
    const categories: Record<string, { totalStock: number; activeProducts: number }> = {};

    data.forEach((item) => {
      if (!categories[item.category]) {
        categories[item.category] = { totalStock: 0, activeProducts: 0 };
      }

      categories[item.category].totalStock += item.stock;
      if (item.active) {
        categories[item.category].activeProducts += 1;
      }
    });

    return Object.entries(categories)
      .map(([name, value]) => ({
        name,
        units: value.totalStock,
        activeProducts: value.activeProducts,
      }))
      .sort((a, b) => b.units - a.units);
  }, [data]);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <StatCard label="Snapshot Date" value={summary.asOf} />
        <StatCard label="Total Units" value={summary.totalUnits.toLocaleString()} />
        <StatCard label="Critical Products" value={String(summary.criticalProducts)} />
        <StatCard label="Active Products" value={String(summary.activeProducts)} />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-foreground">Latest Stock by Category</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(215,16%,47%)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(215,16%,47%)" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222,47%,9%)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value} units`, "Stock"]}
            labelFormatter={(label) => `${label} category`}
          />
          <Bar dataKey="units" radius={[4, 4, 0, 0]}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/80 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
