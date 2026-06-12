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

type KPIResponse = {
  totalDemand: number;
  inventoryCost: number;
  stockoutRisk: number;
  overstockRisk: number;
  revenue: number;
  accuracy: number;
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
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader 
          title={t('dashboard:title')} 
          subtitle={t('dashboard:subtitle')} 
        />

        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <KPICard
              title={t('dashboard:kpi.totalDemand')}
              value={kpiData?.totalDemand ?? 0}
              suffix={t('dashboard:kpi.unitsSuffix')}
              change={12}
              changeLabel={t('dashboard:kpi.vsLastPeriod')}
              icon={TrendingUp}
              color="primary"
              delay={0}
            />
            <KPICard
              title={t('dashboard:kpi.inventoryCost')}
              value={convertCurrency(kpiData?.inventoryCost ?? 0)}
              prefix={currencySymbol}
              change={-8}
              changeLabel={t('dashboard:kpi.vsLastPeriod')}
              icon={DollarSign}
              color="success"
              delay={0.1}
            />
            <KPICard
              title={t('dashboard:kpi.stockoutRisk')}
              value={kpiData?.stockoutRisk ?? 0}
              suffix={t('dashboard:kpi.percentSuffix')}
              change={-15}
              changeLabel={t('dashboard:kpi.lowerThanLastMonth')}
              icon={AlertTriangle}
              color="warning"
              delay={0.2}
            />
            <KPICard
              title={t('dashboard:kpi.overstockRisk')}
              value={kpiData?.overstockRisk ?? 0}
              suffix={t('dashboard:kpi.percentSuffix')}
              change={-5}
              changeLabel={t('dashboard:kpi.improvement')}
              icon={Package}
              color="accent"
              delay={0.3}
            />
          </div>

          <AISummaryCard
            title={t('dashboard:aiSummary')}
            question={t('dashboard:aiSummaryQuestion')}
          />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
            <div className="lg:col-span-2">
              <DemandChart />
            </div>
            <div>
              <AlertsPanel />
            </div>
          </div>

          {/* Heatmap */}
          <HeatmapChart />
        </main>
      </div>

      <AIChatbot />
    </div>
  );
};

export default Dashboard;
