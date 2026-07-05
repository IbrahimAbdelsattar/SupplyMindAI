import React from 'react';
import { FileText, HardDrive, TrendingUp, AlertTriangle } from 'lucide-react';
import { SectionHeader } from '../shared/SectionHeader';
import { TYPE_COLORS } from '../data/usereports';

interface Props {
  totalReports: number;
  formattedTotalSize: string;
  healthyPct: number;
  issuesCount: number;
}

const metrics = [
  { key: 'total', label: 'Total Reports', icon: FileText, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { key: 'size', label: 'Storage Used', icon: HardDrive, color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  { key: 'health', label: 'Inventory Health', icon: TrendingUp, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { key: 'issues', label: 'Active Issues', icon: AlertTriangle, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
];

export function ReportOverview({ totalReports, formattedTotalSize, healthyPct, issuesCount }: Props) {
  const values: Record<string, string | number> = {
    total: totalReports,
    size: formattedTotalSize,
    health: `${healthyPct}%`,
    issues: issuesCount,
  };

  return (
    <section aria-label="Report overview metrics">
      <SectionHeader
        title="Report Overview"
        subtitle="Key metrics across all reports"
        icon={<TrendingUp className="w-4 h-4" />}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div
              key={m.key}
              className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 p-4 sm:p-5"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${m.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{m.label}</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{values[m.key]}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
