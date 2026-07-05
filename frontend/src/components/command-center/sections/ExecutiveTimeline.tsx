import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { SectionHeader } from '../shared/SectionHeader';
import { formatRelativeTime } from '../shared/formatRelativeTime';
import type { TimelineEvent } from '../data/types';

interface ExecutiveTimelineProps {
  events: TimelineEvent[];
}

const typeConfig: Record<
  TimelineEvent['type'],
  { color: string; bg: string; icon: string }
> = {
  alert: {
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10 border-red-200 dark:border-red-800/40',
    icon: '🔴',
  },
  action: {
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10 border-blue-200 dark:border-blue-800/40',
    icon: '🔵',
  },
  insight: {
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10 border-purple-200 dark:border-purple-800/40',
    icon: '🟣',
  },
  system: {
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-500/10 border-slate-200 dark:border-slate-700/40',
    icon: '⚪',
  },
  forecast: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-800/40',
    icon: '🟢',
  },
};

export function ExecutiveTimeline({ events }: ExecutiveTimelineProps) {
  const { t } = useTranslation('commandCenter');
  return (
    <div className="neu-card p-5">
      <SectionHeader
        title="Event Timeline"
        subtitle={`${events.length} recent events`}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
        }
      />

      <div className="relative max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
        <div className="absolute left-[18px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />

        {events.map((event, i) => {
          const config = typeConfig[event.type];
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06, ease: [0.23, 1, 0.32, 1] }}
              className="relative flex gap-4 pb-5 last:pb-0"
            >
              <div className="relative z-10 flex-shrink-0 w-[14px] h-[14px] mt-1.5 rounded-full border-2 border-white dark:border-slate-900 bg-current"
                style={{ color: event.severity === 'critical' ? '#ef4444' : event.severity === 'high' ? '#f59e0b' : '#94a3b8' }}
              >
                {event.completed && (
                  <svg className="absolute -inset-0.5 w-4 h-4 text-emerald-500" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0a8 8 0 110 16A8 8 0 018 0zm3.3 5.3L7.1 10.5 4.7 8.1a.7.7 0 00-1 1l3 3a.7.7 0 001 0l5-5a.7.7 0 00-1-1z" />
                  </svg>
                )}
              </div>

              <div className={`flex-1 rounded-xl border p-3 ${config.bg}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs">{config.icon}</span>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {event.title}
                    </h4>
                  </div>
                  <span className="flex-shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                    {formatRelativeTime(event.timestamp, t, 'commandCenter', 'timeAgo')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {event.description}
                </p>
              </div>
            </motion.div>
          );
        })}

        <div className="sticky bottom-0 h-8 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
