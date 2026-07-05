import { useTranslation } from 'react-i18next';
import type { MetricStatus } from '../data/types';

interface StatusPillProps {
  status: MetricStatus;
  label?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<
  MetricStatus,
  { bg: string; dot: string; text: string }
> = {
  healthy: {
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  warning: {
    bg: 'bg-amber-500/10 border-amber-500/20',
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
  },
  critical: {
    bg: 'bg-red-500/10 border-red-500/20',
    dot: 'bg-red-500',
    text: 'text-red-700 dark:text-red-400',
  },
  neutral: {
    bg: 'bg-slate-500/10 border-slate-500/20',
    dot: 'bg-slate-500',
    text: 'text-slate-700 dark:text-slate-400',
  },
};

export function StatusPill({ status, label, size = 'sm' }: StatusPillProps) {
  const { t } = useTranslation('commandCenter');
  const config = statusConfig[status];
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}
        ${config.bg} ${config.text}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      {label ?? t(`statusPill.${status}`)}
    </span>
  );
}
