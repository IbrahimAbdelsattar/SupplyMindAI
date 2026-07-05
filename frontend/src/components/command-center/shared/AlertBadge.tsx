import { useTranslation } from 'react-i18next';
import type { Severity } from '../data/types';

interface AlertBadgeProps {
  severity: Severity;
  count?: number;
  size?: 'sm' | 'md';
}

const severityConfig: Record<
  Severity,
  { bg: string; text: string; dot: string }
> = {
  critical: {
    bg: 'bg-red-500/10 border-red-500/20',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
  high: {
    bg: 'bg-orange-500/10 border-orange-500/20',
    text: 'text-orange-700 dark:text-orange-400',
    dot: 'bg-orange-500',
  },
  medium: {
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  low: {
    bg: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
};

export function AlertBadge({ severity, count, size = 'sm' }: AlertBadgeProps) {
  const { t } = useTranslation('commandCenter');
  const config = severityConfig[severity];
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}
        ${config.bg} ${config.text}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      {count !== undefined ? `${count} ` : ''}
      {t(`alertBadge.${severity}`)}
    </span>
  );
}
