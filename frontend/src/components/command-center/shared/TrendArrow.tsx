import { memo } from 'react';

interface TrendArrowProps {
  trend: 'up' | 'down' | 'flat';
  value: string;
}

const COLORS = {
  up: 'text-emerald-500',
  down: 'text-red-500',
  flat: 'text-slate-400 dark:text-slate-500',
} as const;

const ICONS = {
  up: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
    </svg>
  ),
  down: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
    </svg>
  ),
  flat: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  ),
} as const;

export const TrendArrow = memo(function TrendArrow({ trend, value }: TrendArrowProps) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${COLORS[trend]}`}>
      {ICONS[trend]}
      {value}
    </span>
  );
});
