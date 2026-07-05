import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { Recommendation } from '../data/types';
import { ConfidenceBadge } from '../shared/ConfidenceBadge';
import { ActionButton } from '../shared/ActionButton';
import { SectionHeader } from '../shared/SectionHeader';

interface RecommendedActionsProps {
  recommendations: Recommendation[];
  onAction?: (actionLabel: string, relatedAlertId?: string) => void;
}

const EASE = [0.23, 1, 0.32, 1] as const;

const priorityBorder: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-amber-400',
  low: 'border-l-slate-300 dark:border-l-slate-600',
};

const priorityDot: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-slate-400',
};

const priorityOrder: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function RecommendedActions({ recommendations, onAction }: RecommendedActionsProps) {
  const { t } = useTranslation('commandCenter');
  const sorted = [...recommendations].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return (
    <div>
      <SectionHeader
        title={t('recommendations.title')}
        subtitle={t('recommendations.subtitle', { count: recommendations.length })}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        }
      />

      <div className="space-y-3">
        {sorted.map((rec, i) => (
          <motion.div
            key={rec.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE, delay: i * 0.05 }}
            className={`neu-card border-l-4 ${priorityBorder[rec.priority]} p-4 hover:neu-lift`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[rec.priority]}`} aria-hidden="true" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {rec.title}
                </h4>
              </div>
              <ConfidenceBadge value={rec.confidence} />
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
              {rec.description}
            </p>

            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mb-3">
              {rec.impact}
            </p>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {rec.estimatedSavings && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {rec.estimatedSavings}
                  </span>
                )}
                {rec.relatedAlertId && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {t('recommendations.linkedAlert')}
                  </span>
                )}
              </div>
              <ActionButton
                label={rec.actionLabel}
                variant="primary"
                size="sm"
                onClick={() => onAction?.(rec.actionLabel, rec.relatedAlertId)}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
