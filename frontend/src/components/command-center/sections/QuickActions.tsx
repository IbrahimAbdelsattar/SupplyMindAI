import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { SectionHeader } from '../shared/SectionHeader';
import { formatRelativeTime } from '../shared/formatRelativeTime';
import type { QuickAction } from '../data/types';

interface QuickActionsProps {
  actions: QuickAction[];
  actionStatuses: Record<string, string>;
  onRun: (id: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  TrendingUp: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  Package: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  FileText: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  RefreshCw: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  ),
  Brain: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.44 2.5 2.5 0 01-2.96-3.08 3 3 0 01-.34-5.58 2.5 2.5 0 011.32-4.24 2.5 2.5 0 011.98-3A2.5 2.5 0 019.5 2z" />
      <path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.44 2.5 2.5 0 002.96-3.08 3 3 0 00.34-5.58 2.5 2.5 0 00-1.32-4.24 2.5 2.5 0 00-1.98-3A2.5 2.5 0 0014.5 2z" />
    </svg>
  ),
};

const statusColors: Record<string, string> = {
  idle: 'text-slate-400 dark:text-slate-500',
  running: 'text-blue-500',
  success: 'text-emerald-500',
  error: 'text-red-500',
};

const statusBgs: Record<string, string> = {
  idle: '',
  running: 'ring-2 ring-blue-500/30',
  success: 'ring-2 ring-emerald-500/30',
  error: 'ring-2 ring-red-500/30',
};

export function QuickActions({ actions, actionStatuses, onRun }: QuickActionsProps) {
  const { t } = useTranslation('commandCenter');

  return (
    <div className="neu-card p-5">
      <SectionHeader
        title={t('quickActions.title')}
        subtitle={t('quickActions.subtitle', { count: actions.length })}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        }
      />

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none md:grid md:grid-cols-3 md:overflow-visible">
        {actions.map((action, i) => {
          const currentStatus = actionStatuses[action.id] ?? action.status ?? 'idle';
          const isRunning = currentStatus === 'running';

          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06, ease: [0.23, 1, 0.32, 1] }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.97 }}
              onClick={() => !isRunning && onRun(action.id)}
              disabled={isRunning}
              aria-label={`${action.label}: ${action.description}`}
              className={`
                flex-shrink-0 w-[200px] md:w-auto neu-btn p-4 text-left neu-focus
                disabled:opacity-60 disabled:cursor-not-allowed
                ${statusBgs[currentStatus] ?? ''}
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  {isRunning ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  ) : (
                    iconMap[action.icon] ?? iconMap.Package
                  )}
                </div>
                <span className={`text-[10px] font-medium ${statusColors[currentStatus] ?? ''}`}>
                  {t(`quickActions.${currentStatus}`)}
                </span>
              </div>

              <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-1">
                {action.label}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mb-2 line-clamp-2">
                {action.description}
              </p>

              {action.lastRun && (
                <span className="text-[9px] text-slate-400 dark:text-slate-500">
                  {t('quickActions.lastRun')} {formatRelativeTime(action.lastRun, t, 'commandCenter', 'quickActions.timeAgo')}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
