import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Package,
  Clock,
  Check,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { AlertItem, AlertSeverity } from '../data/types';

interface AlertDetailModalProps {
  alert: AlertItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
}

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  critical:
    'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  medium:
    'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  low: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
};

const TYPE_LABELS: Record<string, string> = {
  stockout: 'Stockout',
  low_stock: 'Low Stock',
  critical_stock: 'Critical Stock',
  overstock: 'Overstock',
};

function getAlertIcon(type: string) {
  return type === 'stockout' || type === 'critical_stock'
    ? AlertTriangle
    : Package;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AlertDetailModal({
  alert,
  open,
  onOpenChange,
  onAcknowledge,
  onDismiss,
}: AlertDetailModalProps) {
  if (!alert) return null;

  const Icon = getAlertIcon(alert.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-700/40">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
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
                className={`w-5 h-5 ${
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
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white">
                {alert.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Alert Details
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${SEVERITY_BADGE[alert.severity]}`}
            >
              {alert.severity.toUpperCase()}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {TYPE_LABELS[alert.type] ?? alert.type}
            </span>
            {alert.acknowledged && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Acknowledged
              </span>
            )}
          </div>

          {/* Description */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {alert.description}
            </p>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Product ID
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                {alert.product_id}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Created
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                {formatDate(alert.created_at)}
              </p>
            </div>
            {alert.acknowledged && alert.acknowledged_at && (
              <div className="col-span-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3">
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  Acknowledged
                </p>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mt-1">
                  {formatDate(alert.acknowledged_at)}
                  {alert.acknowledged_by && ` by ${alert.acknowledged_by}`}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {!alert.acknowledged && onAcknowledge && (
              <Button
                size="sm"
                onClick={() => onAcknowledge(alert.id)}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Acknowledge
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onDismiss(alert.id);
                  onOpenChange(false);
                }}
                className="gap-1.5"
              >
                Dismiss Alert
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="ml-auto gap-1.5"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
