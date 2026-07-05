import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, HardDrive, Zap } from 'lucide-react';
import { SectionHeader } from '../shared/SectionHeader';
import type { SystemMetrics } from '../data/types';

interface SystemResourcesProps {
  data: SystemMetrics | undefined;
  isLoading: boolean;
}

function ResourceBar({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const pct = Math.min(100, Math.max(0, value));
  const isHigh = pct > 80;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 dark:text-slate-500" aria-hidden="true">{icon}</span>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
        </div>
        <span className={`text-xs font-bold tabular-nums ${isHigh ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div
        className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${pct.toFixed(1)}%`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${isHigh ? 'bg-rose-500' : color}`}
        />
      </div>
    </div>
  );
}

export function SystemResources({ data, isLoading }: SystemResourcesProps) {
  const sys = data ?? { cpu: 0, memory: 0, gpu: 0 };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.34 }}
      className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 p-5"
    >
      <SectionHeader
        title="System Resources"
        icon={<Cpu className="w-4 h-4" aria-hidden="true" />}
      />

      {isLoading ? (
        <div className="text-center py-6 text-sm text-slate-400 dark:text-slate-500">
          Loading resources…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ResourceBar label="CPU" value={sys.cpu} icon={<Cpu className="w-3.5 h-3.5" />} color="bg-blue-500" />
          <ResourceBar label="Memory" value={sys.memory} icon={<HardDrive className="w-3.5 h-3.5" />} color="bg-violet-500" />
          <ResourceBar label="GPU" value={sys.gpu} icon={<Zap className="w-3.5 h-3.5" />} color="bg-amber-500" />
        </div>
      )}
    </motion.div>
  );
}
