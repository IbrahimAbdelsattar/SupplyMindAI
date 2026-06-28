import { useMemo } from "react";
import { motion } from "framer-motion";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { InventoryItem } from "./InventoryTable";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export interface InventorySummary {
  asOf: string;
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalUnits: number;
  criticalProducts: number;
  lowProducts: number;
  healthyProducts: number;
}

interface StockChartProps {
  data: InventoryItem[];
  summary: InventorySummary;
}

export default function StockChart({ data, summary }: StockChartProps) {
  const { t } = useTranslation();

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

  const statCards = [
    { label: t('inventory:stockChart.snapshotDate', 'Snapshot Date'), value: summary.asOf, color: 'primary' },
    { label: t('inventory:stockChart.totalUnits', 'Total Units'), value: summary.totalUnits.toLocaleString(), color: 'success' },
    { label: t('inventory:stockChart.criticalItems', 'Critical Items'), value: String(summary.criticalProducts), color: 'destructive' },
    { label: t('inventory:stockChart.activeProducts', 'Active Products'), value: String(summary.activeProducts), color: 'accent' },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card border border-border rounded-2xl p-4 sm:p-6"
    >
      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
            className={cn(
              'rounded-xl border p-3 sm:p-4',
              stat.color === 'primary' && 'border-primary/20 bg-primary/5',
              stat.color === 'success' && 'border-success/20 bg-success/5',
              stat.color === 'destructive' && 'border-destructive/20 bg-destructive/5',
              stat.color === 'accent' && 'border-accent/20 bg-accent/5',
            )}
          >
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-0.5">{stat.label}</p>
            <p className={cn(
              'text-base sm:text-xl font-bold',
              stat.color === 'primary' && 'text-primary',
              stat.color === 'success' && 'text-success',
              stat.color === 'destructive' && 'text-destructive',
              stat.color === 'accent' && 'text-accent',
            )}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Chart title */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{t('inventory:stockChart.title', 'Latest Stock by Category')}</h3>
        <p className="text-xs text-muted-foreground">{t('inventory:stockChart.description', 'Inventory distribution across product categories')}</p>
      </div>

      {/* Bar chart */}
      <div className="h-52 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value.toLocaleString()} units`, "Stock"]}
              labelFormatter={(label) => `${label}`}
            />
            <Bar dataKey="units" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell
                  key={index}
                  fill={
                    index === 0
                      ? 'hsl(var(--primary))'
                      : `hsl(var(--primary) / ${Math.max(0.3, 1 - index * 0.12)})`
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
