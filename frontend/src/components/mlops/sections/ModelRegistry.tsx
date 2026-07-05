import React from 'react';
import { motion } from 'framer-motion';
import { Database, CheckCircle, Clock } from 'lucide-react';
import { SectionHeader } from '../shared/SectionHeader';

interface ModelVersion {
  name: string;
  version: string;
  accuracy: number;
  status: string;
  date: string;
}

interface ModelRegistryProps {
  versions?: ModelVersion[];
  isLoading: boolean;
}

const MOCK_VERSIONS: ModelVersion[] = [
  { name: 'demand-forecast', version: 'v2.3.1', accuracy: 94.7, status: 'production', date: 'Jan 15, 2025' },
  { name: 'demand-forecast', version: 'v2.3.0', accuracy: 93.2, status: 'archived', date: 'Dec 28, 2024' },
  { name: 'demand-forecast', version: 'v2.2.0', accuracy: 91.8, status: 'archived', date: 'Nov 10, 2024' },
];

function StatusBadge({ status }: { status: string }) {
  const isProd = status === 'production';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
      isProd
        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
    }`}>
      {isProd ? <CheckCircle className="w-3 h-3" aria-hidden="true" /> : <Clock className="w-3 h-3" aria-hidden="true" />}
      {status}
    </span>
  );
}

export function ModelRegistry({ versions, isLoading }: ModelRegistryProps) {
  const data = versions ?? MOCK_VERSIONS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.4 }}
      className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 p-5"
    >
      <SectionHeader
        title="Model Registry"
        subtitle={`${data.length} versions`}
        icon={<Database className="w-4 h-4" aria-hidden="true" />}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-left" role="table">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th className="pb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Model</th>
              <th className="pb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Version</th>
              <th className="pb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Accuracy</th>
              <th className="pb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
              <th className="pb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((v, i) => (
              <motion.tr
                key={`${v.version}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.04 * i, duration: 0.25 }}
                className="border-b border-slate-50 dark:border-slate-800/50 last:border-0"
              >
                <td className="py-3 text-sm font-medium text-slate-900 dark:text-white">{v.name}</td>
                <td className="py-3 text-sm text-slate-600 dark:text-slate-300 tabular-nums">{v.version}</td>
                <td className="py-3 text-sm text-slate-600 dark:text-slate-300 tabular-nums">{v.accuracy}%</td>
                <td className="py-3"><StatusBadge status={v.status} /></td>
                <td className="py-3 text-sm text-slate-500 dark:text-slate-400">{v.date}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
