import { useTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  AlertTriangle,
  Package,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

import { useAlerts } from '@/components/alerts/data/useAlerts';
import {
  AlertSummary,
  AlertList,
  AlertDetailModal,
} from '@/components/alerts/sections';
import {
  AlertSummarySkeleton,
  AlertListSkeleton,
} from '@/components/alerts/shared/Skeletons';
import type { AlertItem } from '@/components/alerts/data/types';

export default function AlertsPage() {
  const { t } = useTranslation();
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const {
    alerts,
    total,
    severityCounts,
    byType,
    isLoading,
    error,
    refresh,
    acknowledge,
    dismiss,
    isAcknowledging,
    isDismissing,
  } = useAlerts();

  const stockoutAlerts = byType['stockout'] ?? [];
  const lowStockAlerts = byType['low_stock'] ?? [];
  const criticalStockAlerts = byType['critical_stock'] ?? [];
  const otherAlerts = alerts.filter(
    (a) => !['stockout', 'low_stock', 'critical_stock'].includes(a.type),
  );

  const handleSelect = useCallback((alert: AlertItem) => {
    setSelectedAlert(alert);
    setDetailOpen(true);
  }, []);

  const handleAcknowledge = useCallback(
    (alertId: string) => {
      acknowledge(alertId);
      setDetailOpen(false);
      setSelectedAlert(null);
    },
    [acknowledge],
  );

  const handleDismiss = useCallback(
    (alertId: string) => {
      dismiss(alertId);
      setDetailOpen(false);
      setSelectedAlert(null);
    },
    [dismiss],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          title={t('alerts:title', 'Active Alerts')}
          subtitle={t('alerts:subtitle', 'Real-time inventory and stockout alerts')}
        />

        <main
          className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 pt-6"
          role="main"
          aria-label="Alerts dashboard"
        >
          {/* ── Quick Actions ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.3 }}
            className="flex justify-end mb-6"
          >
            <Button
              size="sm"
              variant="outline"
              onClick={refresh}
              className="gap-2"
              aria-label="Refresh alerts"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              {t('alerts:refresh', 'Refresh')}
            </Button>
          </motion.div>

          {/* ── Error State ── */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-5 mb-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle
                    className="w-5 h-5 text-rose-600 dark:text-rose-400"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                    {t('alerts:error', 'Failed to load alerts')}
                  </p>
                  <p className="text-xs text-rose-600/70 dark:text-rose-400/60 mt-0.5">
                    Pull to refresh or try again later.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Content Grid ── */}
          <div className="space-y-6">
            {/* Row 1: Severity Summary */}
            {isLoading ? (
              <AlertSummarySkeleton />
            ) : (
              <AlertSummary
                total={total}
                severityCounts={severityCounts}
                isLoading={isLoading}
              />
            )}

            {/* Row 2: Stockout + Critical Stock (prominent) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {isLoading ? (
                <AlertListSkeleton />
              ) : (
                <AlertList
                  alerts={stockoutAlerts}
                  isLoading={isLoading}
                  title="Stockout Alerts"
                  subtitle="Products with zero stock"
                  icon={<AlertTriangle className="w-4 h-4" aria-hidden="true" />}
                  emptyMessage="No stockouts"
                  emptySubtext="All products have stock available."
                  onAcknowledge={handleAcknowledge}
                  onDismiss={handleDismiss}
                  onSelect={handleSelect}
                  isAcknowledging={isAcknowledging}
                  isDismissing={isDismissing}
                />
              )}
              {isLoading ? (
                <AlertListSkeleton />
              ) : (
                <AlertList
                  alerts={criticalStockAlerts}
                  isLoading={isLoading}
                  title="Critical Stock Alerts"
                  subtitle="Products at imminent risk"
                  icon={<AlertCircle className="w-4 h-4" aria-hidden="true" />}
                  emptyMessage="No critical stock"
                  emptySubtext="No products are at critical levels."
                  onAcknowledge={handleAcknowledge}
                  onDismiss={handleDismiss}
                  onSelect={handleSelect}
                  isAcknowledging={isAcknowledging}
                  isDismissing={isDismissing}
                />
              )}
            </div>

            {/* Row 3: Low Stock + Other */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {isLoading ? (
                <AlertListSkeleton />
              ) : (
                <AlertList
                  alerts={lowStockAlerts}
                  isLoading={isLoading}
                  title="Low Stock Alerts"
                  subtitle="Products below reorder threshold"
                  icon={<Package className="w-4 h-4" aria-hidden="true" />}
                  emptyMessage="No low stock alerts"
                  emptySubtext="All products are above reorder levels."
                  onAcknowledge={handleAcknowledge}
                  onDismiss={handleDismiss}
                  onSelect={handleSelect}
                  isAcknowledging={isAcknowledging}
                  isDismissing={isDismissing}
                />
              )}
              {otherAlerts.length > 0 &&
                (isLoading ? (
                  <AlertListSkeleton />
                ) : (
                  <AlertList
                    alerts={otherAlerts}
                    isLoading={isLoading}
                    title="Other Alerts"
                    subtitle="Additional notifications"
                    icon={
                      <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    }
                    onAcknowledge={handleAcknowledge}
                    onDismiss={handleDismiss}
                    onSelect={handleSelect}
                    isAcknowledging={isAcknowledging}
                    isDismissing={isDismissing}
                  />
                ))}
            </div>
          </div>
        </main>
      </div>

      {/* ── Detail Modal ── */}
      <AlertDetailModal
        alert={selectedAlert}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onAcknowledge={handleAcknowledge}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
