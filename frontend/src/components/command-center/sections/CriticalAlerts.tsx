import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import type { CriticalAlert } from '../data/types';
import { AlertBadge } from '../shared/AlertBadge';
import { ActionButton } from '../shared/ActionButton';
import { SectionHeader } from '../shared/SectionHeader';
import { formatRelativeTime } from '../shared/formatRelativeTime';

interface CriticalAlertsProps {
  alerts: CriticalAlert[];
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
}

const EASE = [0.23, 1, 0.32, 1] as const;

const severityOrder: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function CriticalAlerts({
  alerts,
  onAcknowledge,
  onDismiss,
}: CriticalAlertsProps) {
  const { t } = useTranslation('commandCenter');
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const { active, acknowledged } = useMemo(() => {
    const sorted = [...alerts].sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );
    return {
      active: sorted.filter((a) => a.status === 'active'),
      acknowledged: sorted.filter((a) => a.status === 'acknowledged'),
    };
  }, [alerts]);

  const criticalCount = useMemo(
    () => active.filter((a) => a.severity === 'critical').length,
    [active]
  );

  return (
    <div>
      <SectionHeader
        title={t('alerts.title')}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        }
        badge={<AlertBadge severity="critical" count={criticalCount} />}
      />

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {active.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="neu-basin p-8 text-center"
            >
              <svg className="w-8 h-8 mx-auto text-emerald-500 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('alerts.empty')}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('alerts.emptySub')}</p>
            </motion.div>
          )}

          {active.map((alert, i) => (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
              transition={{ duration: 0.4, ease: EASE, delay: i * 0.05 }}
              className="neu-card p-4 hover:neu-lift"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertBadge severity={alert.severity} />
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {alert.title}
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  {formatRelativeTime(alert.triggeredAt, t, 'commandCenter', 'alerts.timeAgo')}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                {alert.description}
              </p>

              {/* Metric / Threshold */}
              {(alert.metric || alert.threshold) && (
                <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  {alert.metric && (
                    <span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{t('alerts.current')}</span>{' '}
                      {alert.metric}
                    </span>
                  )}
                  {alert.threshold && (
                    <span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{t('alerts.threshold')}</span>{' '}
                      {alert.threshold}
                    </span>
                  )}
                </div>
              )}

              {/* Affected Products */}
              {alert.affectedProducts && alert.affectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {alert.affectedProducts.map((sku) => (
                    <span
                      key={sku}
                      className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded"
                    >
                      {sku}
                    </span>
                  ))}
                </div>
              )}

              {/* Source */}
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-3">
                {t('alerts.source')} {alert.source}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <ActionButton
                  label={t('alerts.acknowledge')}
                  variant="secondary"
                  size="sm"
                  onClick={() => onAcknowledge(alert.id)}
                />
                <ActionButton
                  label={t('alerts.dismiss')}
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(alert.id)}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Acknowledged alerts — collapsible */}
        {acknowledged.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowAcknowledged((v) => !v)}
              className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors w-full py-1.5"
            >
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${showAcknowledged ? 'rotate-90' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              {t('alerts.acknowledged')} ({acknowledged.length})
            </button>

            <AnimatePresence>
              {showAcknowledged && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-2">
                    {acknowledged.map((alert) => (
                      <div
                        key={alert.id}
                        className="neu-basin p-3 opacity-60"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <AlertBadge severity={alert.severity} />
                            <h4 className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                              {alert.title}
                            </h4>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {formatRelativeTime(alert.triggeredAt, t, 'commandCenter', 'alerts.timeAgo')}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                          {alert.description}
                        </p>
                        <div className="flex justify-end mt-2">
                          <ActionButton
                            label={t('alerts.dismiss')}
                            variant="ghost"
                            size="sm"
                            onClick={() => onDismiss(alert.id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
