import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { KPICard } from '@/components/dashboard/KPICard';
import { DemandChart } from '@/components/dashboard/DemandChart';
import { HeatmapChart } from '@/components/dashboard/HeatmapChart';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { AIChatbot } from '@/components/chatbot/AIChatbot';
import { AISummaryCard } from '@/components/ai/AISummaryCard';
import { TrendingUp, DollarSign, AlertTriangle, Package } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/contexts/CurrencyContext';
import { motion } from 'framer-motion';

type KPIResponse = {
  totalDemand: number;
  inventoryCost: number;
  stockoutRisk: number;
  overstockRisk: number;
  revenue: number;
  accuracy: number;
};

// Emil Design: Custom easing curve for snappy UI feel
const easeOutExpo = [0.23, 1, 0.32, 1];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.5, ease: easeOutExpo }
  },
};

const Dashboard = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { convertCurrency, currencySymbol } = useCurrency();

  const { data: kpiData } = useQuery({
    queryKey: ['kpis', 30],
    queryFn: () => apiFetch<KPIResponse>('/data/kpis?period_days=30'),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300 overflow-hidden">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto scrollbar-none relative">
        <DashboardHeader 
          title={t('dashboard:title')} 
          subtitle={t('dashboard:subtitle')} 
        />

        <motion.main 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex-1 p-6 space-y-6 max-w-[1600px] mx-auto w-full"
        >
          {/* KPI Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
            <motion.div variants={itemVariants}>
              <KPICard
                title={t('dashboard:kpi.totalDemand')}
                value={kpiData?.totalDemand ?? 0}
                suffix={t('dashboard:kpi.unitsSuffix')}
                change={12}
                changeLabel={t('dashboard:kpi.vsLastPeriod')}
                icon={TrendingUp}
                color="primary"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <KPICard
                title={t('dashboard:kpi.inventoryCost')}
                value={convertCurrency(kpiData?.inventoryCost ?? 0)}
                prefix={currencySymbol}
                change={-8}
                changeLabel={t('dashboard:kpi.vsLastPeriod')}
                icon={DollarSign}
                color="success"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <KPICard
                title={t('dashboard:kpi.stockoutRisk')}
                value={kpiData?.stockoutRisk ?? 0}
                suffix={t('dashboard:kpi.percentSuffix')}
                change={-15}
                changeLabel={t('dashboard:kpi.lowerThanLastMonth')}
                icon={AlertTriangle}
                color="warning"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <KPICard
                title={t('dashboard:kpi.overstockRisk')}
                value={kpiData?.overstockRisk ?? 0}
                suffix={t('dashboard:kpi.percentSuffix')}
                change={-5}
                changeLabel={t('dashboard:kpi.improvement')}
                icon={Package}
                color="accent"
              />
            </motion.div>
          </div>

          <motion.div variants={itemVariants}>
            <AISummaryCard
              title={t('dashboard:aiSummary')}
              question={t('dashboard:aiSummaryQuestion')}
            />
          </motion.div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className="xl:col-span-2">
              <DemandChart />
            </motion.div>
            <motion.div variants={itemVariants}>
              <AlertsPanel />
            </motion.div>
          </div>

          {/* Heatmap */}
          <motion.div variants={itemVariants} className="pb-12">
            <HeatmapChart />
          </motion.div>
        </motion.main>
      </div>

      <AIChatbot />
    </div>
  );
};

export default Dashboard;
