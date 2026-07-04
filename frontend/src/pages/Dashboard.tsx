import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardKPIGrid } from '@/components/dashboard/DashboardKPIGrid';
import { HeatmapChart } from '@/components/dashboard/HeatmapChart';
import { AIChatbot } from '@/components/chatbot/AIChatbot';
import { AISummaryCard } from '@/components/ai/AISummaryCard';
import { ErrorBoundary } from '@/components/ErrorBoundary';


import { DateRangeProvider, useDateRange } from '@/contexts/DateRangeContext';

// Emil Design: Custom easing curve for snappy UI feel
const easeOutExpo = [0.23, 1, 0.32, 1] as const;


const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.02,
    },
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
  const { periodDays } = useDateRange();

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300 overflow-hidden">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto scrollbar-none relative">
        <DashboardHeader title={t('dashboard:title')} subtitle={t('dashboard:subtitle')} />

        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex-1 p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto w-full min-w-0"
        >
          {/* KPI Section (first to ensure visibility/debuggability) */}
          <motion.div variants={itemVariants}>
            <DashboardKPIGrid periodDays={periodDays} />
          </motion.div>

          <motion.div variants={itemVariants}>
            {/* AI can fail if backend/knowledge indexing is down; do not break the whole dashboard */}
            <ErrorBoundary fallback={<div className="neu-panel rounded-3xl p-6"><div className="text-lg font-bold">{t('dashboard:aiSummary')}</div><div className="text-sm text-muted-foreground mt-1">AI brief failed to load.</div></div>}>
              <AISummaryCard title={t('dashboard:aiSummary')} question={t('dashboard:aiSummaryQuestion')} />
            </ErrorBoundary>

          </motion.div>



          <motion.div variants={itemVariants} className="pb-12">
            <HeatmapChart />
          </motion.div>
        </motion.main>
      </div>

      <AIChatbot />
    </div>
  );
};

export default DashboardInner;
