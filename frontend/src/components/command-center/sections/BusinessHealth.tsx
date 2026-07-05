import { motion } from 'framer-motion';
import type { HealthMetric, MetricStatus } from '../data/types';
import { SparkLine } from '../shared/SparkLine';
import { StatusPill } from '../shared/StatusPill';
import { SectionHeader } from '../shared/SectionHeader';
import { TrendArrow } from '../shared/TrendArrow';

interface BusinessHealthProps {
  metrics: HealthMetric[];
}

const EASE = [0.23, 1, 0.32, 1] as const;

function getOverallStatus(metrics: HealthMetric[]): MetricStatus {
  if (metrics.some((m) => m.status === 'critical')) return 'critical';
  if (metrics.some((m) => m.status === 'warning')) return 'warning';
  return 'healthy';
}

export function BusinessHealth({ metrics }: BusinessHealthProps) {
  const overall = getOverallStatus(metrics);
  const healthyCount = metrics.filter((m) => m.status === 'healthy').length;

  return (
    <div>
      <SectionHeader
        title="Business Health"
        subtitle={`${healthyCount}/${metrics.length} metrics healthy`}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        }
        badge={<StatusPill status={overall} label="Overall" />}
      />

      {/* Overall Bar */}
      <div className="mb-5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(healthyCount / metrics.length) * 100}%` }}
          transition={{ duration: 0.8, ease: EASE }}
          className={`h-full rounded-full ${
            overall === 'healthy'
              ? 'bg-emerald-500'
              : overall === 'warning'
              ? 'bg-amber-500'
              : 'bg-red-500'
          }`}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: i * 0.05 }}
            className="neu-card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {m.label}
              </span>
              <StatusPill status={m.status} />
            </div>

            <div className="flex items-end justify-between gap-2 mb-2">
              <div>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {m.value}
                </span>
                <span className="text-sm font-normal text-slate-400 dark:text-slate-500">
                  {m.unit}
                </span>
              </div>
              <TrendArrow trend={m.trend} value={m.trendValue} />
            </div>

            {m.sparkData && m.sparkData.length > 0 && (
              <div className="flex justify-center mt-1">
                <SparkLine
                  data={m.sparkData}
                  width={120}
                  height={32}
                  color={
                    m.status === 'healthy'
                      ? 'var(--health-healthy)'
                      : m.status === 'warning'
                      ? 'var(--health-warning)'
                      : 'var(--health-critical)'
                  }
                />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
