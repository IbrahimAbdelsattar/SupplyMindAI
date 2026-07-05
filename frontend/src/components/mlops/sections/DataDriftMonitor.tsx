import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, XCircle, Shield } from 'lucide-react';
import { SectionHeader } from '../shared/SectionHeader';
import type { DriftMetric } from '../data/types';

interface DataDriftMonitorProps {
  data: DriftMetric[] | undefined;
  isLoading: boolean;
}

const STATUS_CONFIG = {
  healthy: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    Icon: CheckCircle,
    label: 'Healthy',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    Icon: AlertTriangle,
    label: 'Warning',
  },
  critical: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800',
    Icon: XCircle,
    label: 'Critical',
  },
} as const;

function DriftRow({ metric, index }: { metric: DriftMetric; index: number }) {
  const cfg = STATUS_CONFIG[metric.status];
  const Icon = cfg.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.25 }}
      className={`flex items-center justify-between p-3 rounded-xl border ${cfg.border} ${cfg.bg} transition-colors hover:scale-[1.01]`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex-shrink-0 w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${cfg.text}`} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {metric.feature}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {metric.test ?? 'KS'} · p={metric.p_value?.toFixed(3) ?? 'N/A'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
          {((metric.drift ?? 0) * 100).toFixed(1)}%
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.text} ${cfg.bg}`}>
          {cfg.label}
        </span>
      </div>
    </motion.div>
  );
}

export function DataDriftMonitor({ data, isLoading }: DataDriftMonitorProps) {
  const metrics = data ?? [];
  const healthyCount = metrics.filter((m) => m.status === 'healthy').length;
  const warningCount = metrics.filter((m) => m.status === 'warning').length;
  const criticalCount = metrics.filter((m) => m.status === 'critical').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.22 }}
      className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 p-5"
    >
      <SectionHeader
        title="Data Drift Monitor"
        subtitle={metrics.length > 0 ? `${metrics.length} features tracked` : undefined}
        icon={<Shield className="w-4 h-4" aria-hidden="true" />}
        badge={
          metrics.length > 0 ? (
            <div className="flex items-center gap-1.5 ml-2">
              {healthyCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  {healthyCount}
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                  {warningCount}
                </span>
              )}
              {criticalCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
                  {criticalCount}
                </span>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
            Loading drift metrics…
          </div>
        ) : metrics.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
            No drift data available
          </div>
        ) : (
          metrics.map((metric, i) => (
            <DriftRow key={metric.feature} metric={metric} index={i} />
          ))
        )}
      </div>
    </motion.div>
  );
}
