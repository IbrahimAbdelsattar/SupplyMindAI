import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { MorningBriefData } from '../data/types';
import { HealthGauge } from '../shared/HealthGauge';
import { StatusPill } from '../shared/StatusPill';

interface MorningBriefProps {
  data: MorningBriefData;
}

const EASE = [0.23, 1, 0.32, 1] as const;

function getLocalGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morningBrief.greeting';
  if (hour < 17) return 'morningBrief.greetingAfternoon';
  if (hour < 21) return 'morningBrief.greetingEvening';
  return 'morningBrief.greetingNight';
}

function getLocalDate(locale: string): string {
  return new Date().toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function MorningBrief({ data }: MorningBriefProps) {
  const { t, i18n } = useTranslation('commandCenter');
  const forecastStatus =
    data.forecastAccuracy >= 90 ? 'healthy' : data.forecastAccuracy >= 75 ? 'warning' : 'critical';
  const inventoryStatus =
    data.inventoryHealth >= 90 ? 'healthy' : data.inventoryHealth >= 75 ? 'warning' : 'critical';

  const locale = i18n.language === 'ar' ? 'ar-SA' : i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  const greetingKey = getLocalGreetingKey();
  const localDate = getLocalDate(locale);
  const isArabic = i18n.language === 'ar';
  const summary = isArabic ? data.executiveSummaryAr : data.executiveSummary;
  const priority = isArabic ? data.topPriorityAr : data.topPriority;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="neu-card p-6 md:p-8"
    >
      {/* Greeting + Date */}
      <div className="mb-6">
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wide uppercase">
          {localDate}
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-1">
          {t(greetingKey)}
        </h2>
      </div>

      {/* Executive Summary */}
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 mb-6 max-w-prose">
        {summary}
      </p>

      {/* Status Counts */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-700 dark:text-red-400 px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          {data.criticalCount} {t('morningBrief.critical')}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-700 dark:text-amber-400 px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {data.warningCount} {t('morningBrief.warning')}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-700 dark:text-emerald-400 px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {data.healthyCount} {t('morningBrief.healthy')}
        </span>
      </div>

      {/* Top Priority Callout */}
      {priority && (
        <div className="border-l-4 border-blue-500 bg-blue-500/5 dark:bg-blue-500/5 rounded-r-lg p-4 mb-6">
          <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            {t('morningBrief.topPriority')}
          </p>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
            {priority}
          </p>
        </div>
      )}

      {/* Gauges + Status */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap gap-4 sm:gap-8">
          <HealthGauge
            value={data.forecastAccuracy}
            label={t('morningBrief.forecastAccuracy')}
            status={forecastStatus as 'healthy' | 'warning' | 'critical'}
            size={100}
          />
          <HealthGauge
            value={data.inventoryHealth}
            label={t('morningBrief.inventoryHealth')}
            status={inventoryStatus as 'healthy' | 'warning' | 'critical'}
            size={100}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('morningBrief.supplyChainStatus')}</span>
          <StatusPill status={data.supplyChainStatus} size="md" />
        </div>
      </div>
    </motion.div>
  );
}
