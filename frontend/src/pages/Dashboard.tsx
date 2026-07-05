import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { lazy, Suspense } from 'react';

import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LoadingSpinner from '@/components/LoadingSpinner';
import { DateRangeProvider } from '@/contexts/DateRangeContext';

const CommandCenterPage = lazy(() =>
  import('@/components/command-center/CommandCenterPage').then((m) => ({
    default: m.CommandCenterPage,
  }))
);

const easeOutExpo = [0.23, 1, 0.32, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.15, ease: easeOutExpo },
  },
};

const DashboardInner = () => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300 overflow-hidden">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto scrollbar-none relative">
        <DashboardHeader
          title={t('commandCenter:title')}
          subtitle={t('commandCenter:subtitle')}
        />

        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex-1 p-4 sm:p-6 max-w-[1600px] mx-auto w-full min-w-0"
        >
          <motion.div variants={itemVariants} className="pb-12">
            <ErrorBoundary
              fallback={
                <div className="neu-panel rounded-3xl p-6">
                  <div className="text-lg font-bold">
                    {t('commandCenter:title')}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Command Center failed to load.
                  </div>
                </div>
              }
            >
              <Suspense fallback={<LoadingSpinner />}>
                <CommandCenterPage />
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        </motion.main>
      </div>
    </div>
  );
};

export default DashboardInner;
