import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Package, Clock, Check, X } from 'lucide-react';
import { SectionHeader } from '../shared/SectionHeader';
import type { AlertItem, AlertSeverity } from '../data/types';

interface AlertListProps {
  alerts: AlertItem[];
  isLoading: boolean;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  emptyMessage?: string;
  emptySubtext?: string;
  onAcknowledge?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
  onSelect?: (alert: AlertItem) => void;
  isAcknowledging?: boolean;
  isDismissing?: boolean;
}

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  critical: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  low: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
};

const TYPE_LABELS: Record<string, string> = {
  stockout: 'Stockout',
  low_stock: 'Low Stock',
  critical_stock: 'Critical Stock',
  overstock: 'Overstock',
};

function getAlertIcon(type: string) {
  return type === 'stockout' || type === 'critical_stock' ? AlertTriangle : Package;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function AlertRow({
  alert,
  index,
  onAcknowledge,
  onDismiss,
  onSelect,
}: {
  alert: AlertItem;
  index: number;
  onAcknowledge?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onSelect?: (alert: AlertItem) => void;
}) {
  const Icon = getAlertIcon(alert.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.03 * index, duration: 0.25 }}
      className="group flex items-start gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
      onClick={() => onSelect?.(alert)}
      role="listitem"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(alert);
        }
      }}
      aria-label={`${alert.title} — ${alert.severity}`}
    >
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
          alert.severity === 'critical'
            ? 'bg-rose-500/10'
            : alert.severity === 'high'
              ? 'bg-orange-500/10'
              : alert.severity === 'medium'
                ? 'bg-amber-500/10'
                : 'bg-blue-500/10'
        }`}
      >
        <Icon
          className={`w-4.5 h-4.5 ${
            alert.severity === 'critical'
              ? 'text-rose-600 dark:text-rose-400'
              : alert.severity === 'high'
                ? 'text-orange-600 dark:text-orange-400'
                : alert.severity === 'medium'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-blue-600 dark:text-blue-400'
          }`}
          aria-hidden="true"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {alert.title}
          </p>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${SEVERITY_STYLES[alert.severity]}`}
          >
            {alert.severity}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {TYPE_LABELS[alert.type] ?? alert.type}
          </span>
          {alert.acknowledged && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Check className="w-3 h-3" aria-hidden="true" />
              Acked
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
          {alert.description}
        </p>

        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
              <Package className="w-3 h-3" aria-hidden="true" />
              {alert.product_id}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
              <Clock className="w-3 h-3" aria-hidden="true" />
              {formatTime(alert.created_at)}
            </span>
          </div>

          {/* Action buttons — visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!alert.acknowledged && onAcknowledge && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAcknowledge(alert.id);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                aria-label={`Acknowledge ${alert.title}`}
              >
                <Check className="w-3 h-3" aria-hidden="true" />
                Ack
              </button>
            )}
            {onDismiss && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(alert.id);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20 transition-colors"
                aria-label={`Dismiss ${alert.title}`}
              >
                <X className="w-3 h-3" aria-hidden="true" />
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function AlertList({
  alerts,
  isLoading,
  title,
  subtitle,
  icon,
  emptyMessage,
  emptySubtext,
  onAcknowledge,
  onDismiss,
  onSelect,
  isAcknowledging,
  isDismissing,
}: AlertListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.12 }}
      className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 p-5"
    >
      <SectionHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        badge={
          alerts.length > 0 ? (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[11px] font-bold tabular-nums">
              {alerts.length}
            </span>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
          Loading alerts…
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {emptyMessage ?? 'No alerts'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {emptySubtext ?? 'All inventory levels are healthy.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2" role="list" aria-label={title}>
          {alerts.map((alert, i) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              index={i}
              onAcknowledge={onAcknowledge}
              onDismiss={onDismiss}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
