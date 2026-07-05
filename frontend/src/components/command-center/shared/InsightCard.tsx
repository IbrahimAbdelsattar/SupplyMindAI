import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ConfidenceBadge } from './ConfidenceBadge';
import { formatRelativeTime } from './formatRelativeTime';
import type { InsightCategory } from '../data/types';

interface InsightCardProps {
  title: string;
  body: string;
  category: InsightCategory;
  confidence: number;
  timestamp: string;
  source: string;
  actionable?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

const categoryConfig: Record<
  InsightCategory,
  { icon: string; color: string; bg: string }
> = {
  opportunity: { icon: '💡', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  risk: { icon: '⚠️', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
  optimization: { icon: '⚡', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  trend: { icon: '📈', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
  anomaly: { icon: '🔍', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
};

export function InsightCard({
  title,
  body,
  category,
  confidence,
  timestamp,
  source,
  actionable,
  actionLabel,
  onAction,
}: InsightCardProps) {
  const { t } = useTranslation('commandCenter');
  const config = categoryConfig[category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="neu-card p-4 neu-lift"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm ${config.bg}`}
          >
            {config.icon}
          </span>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {title}
          </h4>
        </div>
        <ConfidenceBadge value={confidence} />
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-3 leading-relaxed">
        {body}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {formatRelativeTime(timestamp, t, 'commandCenter', 'timeAgo')}
          </span>
          <span className="text-[10px] text-slate-300 dark:text-slate-600">
            ·
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {source}
          </span>
        </div>
        {actionable && actionLabel && (
          <button
            onClick={onAction}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {actionLabel} →
          </button>
        )}
      </div>
    </motion.div>
  );
}
