import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { Recommendation, CriticalAlert } from '../data/types';
import { ALERT_AT_RISK_VALUES } from '../data/constants';
import { SectionHeader } from '../shared/SectionHeader';
import { useCurrency } from '@/contexts/CurrencyContext';

interface FinancialImpactProps {
  recommendations: Recommendation[];
  alerts: CriticalAlert[];
}

const EASE = [0.23, 1, 0.32, 1] as const;

function parseDollarValue(s?: string): number {
  if (!s) return 0;
  const match = s.replace(/,/g, '').match(/\$?([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

export function FinancialImpact({ recommendations, alerts }: FinancialImpactProps) {
  const { t } = useTranslation('commandCenter');
  const { formatCurrency } = useCurrency();

  const { totalSavings, totalAtRisk, savingsByCategory } = useMemo(() => {
    let savings = 0;
    const byCategory: Record<string, number> = {};

    for (const rec of recommendations) {
      const val = parseDollarValue(rec.estimatedSavings);
      savings += val;
      byCategory[rec.category] = (byCategory[rec.category] || 0) + val;
    }

    let atRisk = 0;
    for (const alert of alerts) {
      atRisk += ALERT_AT_RISK_VALUES[alert.severity] ?? 0;
    }

    return { totalSavings: savings, totalAtRisk: atRisk, savingsByCategory: byCategory };
  }, [recommendations, alerts]);

  const categories = Object.entries(savingsByCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <SectionHeader
        title="Financial Impact"
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />

      {/* Top-line numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="neu-card p-5"
        >
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Potential Savings
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalSavings)}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            From {recommendations.length} recommendations
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
          className="neu-card p-5"
        >
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            At-Risk Value
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(totalAtRisk)}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            From {alerts.filter((a) => a.status === 'active').length} active alerts
          </p>
        </motion.div>
      </div>

      {/* Net Impact */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
        className="neu-card p-5 mb-5"
      >
        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          Net Opportunity
        </p>
        <p className={`text-xl sm:text-2xl font-bold ${totalSavings - totalAtRisk >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {formatCurrency(Math.abs(totalSavings - totalAtRisk))}
          {totalSavings - totalAtRisk >= 0 ? ' net gain' : ' net risk'}
        </p>
      </motion.div>

      {/* Savings by Category */}
      {categories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.15 }}
          className="neu-card p-5"
        >
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Savings by Category
          </p>
          <div className="space-y-2.5">
            {categories.map(([cat, val]) => (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {cat}
                  </span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(val)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(val / totalSavings) * 100}%` }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
                    className="h-full rounded-full bg-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
