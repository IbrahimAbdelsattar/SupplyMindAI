import React from 'react';
import { Layers } from 'lucide-react';
import { SectionHeader } from '../shared/SectionHeader';
import { TYPE_COLORS, formatFileSize, formatDate } from '../data/useReportsHook';
import type { ReportCategory } from '../data/types';

interface Props {
  categories: ReportCategory[];
}

export function ReportCategories({ categories }: Props) {
  if (categories.length === 0) return null;

  return (
    <section aria-label="Report categories">
      <SectionHeader
        title="Report Categories"
        subtitle="Breakdown by report type"
        icon={<Layers className="w-4 h-4" />}
      />
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.key}
              className="text-left rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 hover:border-blue-400/50 dark:hover:border-blue-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              aria-label={`${cat.label}: ${cat.count} reports`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                  {cat.label}
                </span>
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${TYPE_COLORS[cat.key] || TYPE_COLORS.custom}`}
                >
                  {cat.count}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                {cat.totalSize > 0 ? formatFileSize(cat.totalSize) : 'No data'}
              </p>
              {cat.lastGenerated && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Last: {formatDate(cat.lastGenerated)}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
