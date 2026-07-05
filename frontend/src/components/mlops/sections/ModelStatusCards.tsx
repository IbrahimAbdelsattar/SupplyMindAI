import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Clock,
  Zap,
  Cog,
} from 'lucide-react';
import type { StatusData } from '../data/types';

interface ModelStatusCardsProps {
  status: StatusData | undefined;
  isLoading: boolean;
  onRetrain: () => void;
  isRetraining: boolean;
}

const CARDS = [
  {
    key: 'model',
    label: 'Model Health',
    Icon: Activity,
    getColor: (s: StatusData) =>
      s.modelStatus === 'healthy'
        ? 'text-emerald-600 dark:text-emerald-400'
        : s.modelStatus === 'degraded'
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-rose-600 dark:text-rose-400',
    getBg: (s: StatusData) =>
      s.modelStatus === 'healthy'
        ? 'bg-emerald-500/10'
        : s.modelStatus === 'degraded'
          ? 'bg-amber-500/10'
          : 'bg-rose-500/10',
    getValue: (s: StatusData) =>
      s.modelStatus === 'healthy' ? 'Healthy' : s.modelStatus === 'degraded' ? 'Degraded' : 'Critical',
  },
  {
    key: 'latency',
    label: 'Avg. Latency',
    Icon: Clock,
    getColor: () => 'text-blue-600 dark:text-blue-400',
    getBg: () => 'bg-blue-500/10',
    getValue: (s: StatusData) => s.inferenceLatency || '—',
  },
  {
    key: 'pipeline',
    label: 'Pipeline',
    Icon: Zap,
    getColor: (s: StatusData) =>
      s.pipelineStatus === 'active'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-slate-400 dark:text-slate-500',
    getBg: (s: StatusData) =>
      s.pipelineStatus === 'active' ? 'bg-emerald-500/10' : 'bg-slate-500/10',
    getValue: (s: StatusData) =>
      s.pipelineStatus === 'active' ? 'Active' : 'Inactive',
  },
  {
    key: 'retrain',
    label: 'Last Retrained',
    Icon: Cog,
    getColor: () => 'text-violet-600 dark:text-violet-400',
    getBg: () => 'bg-violet-500/10',
    getValue: (s: StatusData) =>
      s.lastRetrained
        ? new Date(s.lastRetrained).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'Never',
  },
];

export function ModelStatusCards({ status, isLoading, onRetrain, isRetraining }: ModelStatusCardsProps) {
  const displayStatus: StatusData = status ?? {
    modelStatus: 'healthy',
    lastRetrained: null,
    pipelineStatus: 'inactive',
    inferenceLatency: '—',
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {CARDS.map((card, i) => {
        const Icon = card.Icon;
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.35 }}
            className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 p-4 sm:p-5 flex items-center gap-3"
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${card.getBg(displayStatus)} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${card.getColor(displayStatus)}`} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">
                {card.label}
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 truncate">
                {isLoading ? '—' : card.getValue(displayStatus)}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
