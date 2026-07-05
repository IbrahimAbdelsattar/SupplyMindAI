import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { SectionHeader } from '../shared/SectionHeader';
import type { RetrainingEvent } from '../data/types';

interface RetrainingHistoryProps {
  data: RetrainingEvent[] | undefined;
  isLoading: boolean;
}

function RetrainRow({ event, index }: { event: RetrainingEvent; index: number }) {
  const isSuccess = event.status.toLowerCase().includes('success') || event.status.toLowerCase().includes('completed');

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.25 }}
      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
          isSuccess ? 'bg-emerald-500/10' : 'bg-slate-500/10'
        }`}>
          {isSuccess ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          ) : (
            <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {event.trigger}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {event.date}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
          isSuccess
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
        }`}>
          {event.status}
        </span>
        {event.improvement && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
            <TrendingUp className="w-3 h-3" aria-hidden="true" />
            {event.improvement}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function RetrainingHistory({ data, isLoading }: RetrainingHistoryProps) {
  const events = data ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.28 }}
      className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 p-5"
    >
      <SectionHeader
        title="Retraining History"
        subtitle={events.length > 0 ? `${events.length} events` : undefined}
        icon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
      />

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
            Loading retraining history…
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
            No retraining events yet
          </div>
        ) : (
          events.map((event, i) => (
            <RetrainRow key={`${event.date}-${i}`} event={event} index={i} />
          ))
        )}
      </div>
    </motion.div>
  );
}
