import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useCommandCenter } from './data/useCommandCenter';
import { MorningBrief } from './sections/MorningBrief';
import { CriticalAlerts } from './sections/CriticalAlerts';
import { RecommendedActions } from './sections/RecommendedActions';
import { BusinessHealth } from './sections/BusinessHealth';
import { SupplyChainMap } from './sections/SupplyChainMap';
import { ExecutiveTimeline } from './sections/ExecutiveTimeline';
import {
  MorningBriefSkeleton,
  CriticalAlertsSkeleton,
  RecommendedActionsSkeleton,
  BusinessHealthSkeleton,
  SupplyChainMapSkeleton,
  ExecutiveTimelineSkeleton,
} from './shared/Skeletons';

const easeOutExpo = [0.23, 1, 0.32, 1] as const;

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16, scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: easeOutExpo },
  },
};

export function CommandCenterPage() {
  const { t } = useTranslation('commandCenter');
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    morningBrief,
    alerts,
    recommendations,
    healthMetrics,
    timeline,
    supplyChainNodes,
    isLoading,
    acknowledgeAlert,
    dismissAlert,
  } = useCommandCenter();

  const handleAction = (actionLabel: string, relatedAlertId?: string) => {
    if (actionLabel.toLowerCase().includes('po') || actionLabel.includes('شراء')) {
      navigate(relatedAlertId ? `/inventory?createPO=true&alertId=${relatedAlertId}` : '/inventory');
      return;
    }
    toast({ title: actionLabel, description: t('recommendations.toastExecuting') });
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-8"
    >
      {/* 1. Morning Brief (Full Width) */}
      <motion.div variants={staggerItem}>
        {isLoading ? (
          <MorningBriefSkeleton />
        ) : (
          morningBrief && <MorningBrief data={morningBrief} />
        )}
      </motion.div>

      {/* 2. Critical Alerts & Recommended Actions (Grid: 2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={staggerItem}>
          {isLoading ? (
            <CriticalAlertsSkeleton />
          ) : (
            <CriticalAlerts
              alerts={alerts}
              onAcknowledge={acknowledgeAlert}
              onDismiss={dismissAlert}
            />
          )}
        </motion.div>

        <motion.div variants={staggerItem}>
          {isLoading ? (
            <RecommendedActionsSkeleton />
          ) : (
            <RecommendedActions
              recommendations={recommendations}
              onAction={handleAction}
            />
          )}
        </motion.div>
      </div>

      {/* 3. Supply Chain Map (Full Width) */}
      <motion.div variants={staggerItem}>
        {isLoading ? (
          <SupplyChainMapSkeleton />
        ) : (
          <SupplyChainMap nodes={supplyChainNodes} />
        )}
      </motion.div>

      {/* 4. Business Health (Full Width) */}
      <motion.div variants={staggerItem}>
        {isLoading ? (
          <BusinessHealthSkeleton />
        ) : (
          <BusinessHealth metrics={healthMetrics} />
        )}
      </motion.div>

      {/* 5. Executive Timeline (Full Width) */}
      <motion.div variants={staggerItem}>
        {isLoading ? (
          <ExecutiveTimelineSkeleton />
        ) : (
          <ExecutiveTimeline events={timeline} />
        )}
      </motion.div>
    </motion.div>
  );
}
