import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { TrendingUp, Target } from 'lucide-react';
import { SectionHeader } from '../shared/SectionHeader';
import type { AccuracyPoint } from '../data/types';

interface AccuracyChartProps {
  data: AccuracyPoint[] | undefined;
  isLoading: boolean;
}

export function AccuracyChart({ data, isLoading }: AccuracyChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartData = (data ?? []).map((d) => ({
    date: d.date,
    accuracy: d.accuracy * 100,
  }));

  const latestAccuracy = chartData.length > 0 ? chartData[chartData.length - 1].accuracy : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 p-5"
    >
      <SectionHeader
        title="Forecast Accuracy Trend"
        subtitle={latestAccuracy !== null ? `Latest: ${latestAccuracy.toFixed(1)}%` : undefined}
        icon={<TrendingUp className="w-4 h-4" aria-hidden="true" />}
      />

      {isLoading ? (
        <div className="h-52 sm:h-80 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
          Loading accuracy data…
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-52 sm:h-80 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
          <Target className="w-8 h-8 opacity-40" aria-hidden="true" />
          <p className="text-sm">No accuracy data yet</p>
        </div>
      ) : (
        <div className="h-52 sm:h-80" role="img" aria-label="Forecast accuracy line chart showing accuracy percentage over time">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              onMouseMove={(e) => {
                if (e?.activeTooltipIndex !== undefined) {
                  setHoveredIndex(e.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis
                domain={[80, 100]}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Accuracy']}
                labelFormatter={(label) => {
                  const d = new Date(label);
                  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                }}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  padding: '10px 14px',
                }}
              />
              <ReferenceLine
                y={95}
                stroke="#10b981"
                strokeDasharray="5 5"
                strokeOpacity={0.4}
                label={{ value: 'Target 95%', position: 'right', fontSize: 10, fill: '#10b981' }}
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
