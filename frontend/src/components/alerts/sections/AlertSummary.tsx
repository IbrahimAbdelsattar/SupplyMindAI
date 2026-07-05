import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ShieldCheck, AlertCircle, Package } from 'lucide-react';
import type { SeverityCounts } from '../data/types';

interface AlertSummaryProps {
  total: number;
  severityCounts: SeverityCounts;
  isLoading: boolean;
}

const SEVERITY_CONFIG = [
  {
    key: 'critical' as const,
    label: 'Critical',
    Icon: AlertTriangle,
    bg: 'bg-rose-500/10',
    color: 'text-rose-600 dark:text-rose-400',
  },
  {
    key: 'high' as const,
    label: 'High',
    Icon: AlertCircle,
    bg: 'bg-orange-500/10',
    color: 'text-orange-600 dark:text-orange-400',
  },
  {
    key: 'medium' as const,
    label: 'Medium',
    Icon: Package,
    bg: 'bg-amber-500/10',
    color: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'low' as const,
    label: 'Low',
    Icon: ShieldCheck,
    bg: 'bg-blue-500/10',
    color: 'text-blue-600 dark:text-blue-400',
  },
];

export function AlertSummary({ total, severityCounts, isLoading }: AlertSummaryProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {SEVERITY_CONFIG.map((cfg, i) => {
        const Icon = cfg.Icon;
        const count = severityCounts[cfg.key];
        return (
          <motion.div
            key={cfg.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.35 }}
            className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 p-4 sm:p-5 flex items-center gap-3"
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${cfg.color}`} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">
                {cfg.label}
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                {isLoading ? '—' : count}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
