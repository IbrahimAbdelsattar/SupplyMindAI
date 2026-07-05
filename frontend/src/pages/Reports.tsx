import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useReports } from '@/components/reports/data/useReports';
import { ReportOverview } from '@/components/reports/sections/ReportOverview';
import { ReportGenerator } from '@/components/reports/sections/ReportGenerator';
import { RecentReports } from '@/components/reports/sections/RecentReports';
import { ExecutiveSummary } from '@/components/reports/sections/ExecutiveSummary';
import { ReportInsights } from '@/components/reports/sections/ReportInsights';
import {
  ReportOverviewSkeleton,
  ReportGeneratorSkeleton,
  RecentReportsSkeleton,
  ExecutiveSummarySkeleton,
  ReportInsightsSkeleton,
} from '@/components/reports/shared/Skeletons';

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

const Reports = () => {
  const {
    reports,
    recommendations,
    healthyPct,
    totalSavings,
    issuesCount,
    criticalCount,
    formattedTotalSize,
    reportsLoading,
    invLoading,
    recLoading,
    generateMutation,
    generateTypeMutation,
    deleteMutation,
  } = useReports();

  const insightsLoading = recLoading;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          title="Reports"
          subtitle="Analytics, insights, and report generation"
        />

        <main className="flex-1 p-3 sm:p-6 overflow-y-auto">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-4 sm:space-y-6 pb-8"
          >
            {/* 1. Report Overview (Full Width) */}
            <motion.div variants={staggerItem}>
              {reportsLoading ? (
                <ReportOverviewSkeleton />
              ) : (
                <ReportOverview
                  totalReports={reports.length}
                  formattedTotalSize={formattedTotalSize}
                  healthyPct={healthyPct}
                  issuesCount={issuesCount}
                />
              )}
            </motion.div>

            {/* 2. Generate Report (Full Width) */}
            <motion.div variants={staggerItem}>
              {reportsLoading ? (
                <ReportGeneratorSkeleton />
              ) : (
                <ReportGenerator generateMutation={generateMutation} generateTypeMutation={generateTypeMutation} />
              )}
            </motion.div>

            {/* 3. Executive Summary (Full Width) */}
            <motion.div variants={staggerItem}>
              {invLoading ? (
                <ExecutiveSummarySkeleton />
              ) : (
                <ExecutiveSummary
                  healthyPct={healthyPct}
                  totalSavings={totalSavings}
                  issuesCount={issuesCount}
                  criticalCount={criticalCount}
                />
              )}
            </motion.div>

            {/* 4. Recent Reports (Full Width) */}
            <motion.div variants={staggerItem}>
              {reportsLoading ? (
                <RecentReportsSkeleton />
              ) : (
                <RecentReports reports={reports} deleteMutation={deleteMutation} />
              )}
            </motion.div>

            {/* 5. Insights (Full Width) */}
            <motion.div variants={staggerItem}>
              {insightsLoading ? (
                <ReportInsightsSkeleton />
              ) : (
                <ReportInsights recommendations={recommendations} />
              )}
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Reports;
