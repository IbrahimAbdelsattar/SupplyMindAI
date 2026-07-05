import React from 'react';
import { TrendingUp, Package, AlertTriangle } from 'lucide-react';
import { SectionHeader } from '../shared/SectionHeader';
import { useCurrency } from '@/contexts/CurrencyContext';

interface Props {
  healthyPct: number;
  totalSavings: number;
  issuesCount: number;
  criticalCount: number;
}

export function ExecutiveSummary({ healthyPct, totalSavings, issuesCount, criticalCount }: Props) {
  const { formatCurrency } = useCurrency();

  return (
    <section aria-label="Executive summary">
      <SectionHeader
        title="Executive Summary"
        subtitle="High-level performance snapshot"
        icon={<TrendingUp className="w-4 h-4" />}
      />
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 p-5">
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4">
          <div className="text-center p-3 sm:p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200/50 dark:border-emerald-500/20">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-1.5" />
            <p className="text-xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400">{healthyPct}%</p>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">Inventory Health</p>
          </div>
          <div className="text-center p-3 sm:p-4 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200/50 dark:border-blue-500/20">
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400 mx-auto mb-1.5" />
            <p className="text-xl sm:text-3xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(totalSavings)}</p>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">Potential Savings</p>
          </div>
          <div className="text-center p-3 sm:p-4 rounded-xl bg-rose-50 dark:bg-rose-500/5 border border-rose-200/50 dark:border-rose-500/20">
            <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-rose-600 dark:text-rose-400 mx-auto mb-1.5" />
            <p className="text-xl sm:text-3xl font-bold text-rose-700 dark:text-rose-400">{issuesCount}</p>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">Active Issues</p>
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className="font-semibold">Summary:</span>{' '}
            {healthyPct >= 80
              ? `Inventory health is strong at ${healthyPct}%. `
              : `Inventory health needs attention at ${healthyPct}%. `}
            {totalSavings > 0
              ? `Optimization recommendations could save ${formatCurrency(totalSavings)}. `
              : 'No cost savings opportunities identified. '}
            {criticalCount > 0
              ? `${criticalCount} critical issues require immediate attention.`
              : issuesCount > 0
              ? `${issuesCount} issues identified for review.`
              : 'All systems operating within normal parameters.'}
          </p>
        </div>
      </div>
    </section>
  );
}
