import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { KPICard } from '@/components/dashboard/KPICard';
import { DemandChart } from '@/components/dashboard/DemandChart';
import { HeatmapChart } from '@/components/dashboard/HeatmapChart';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { AIChatbot } from '@/components/chatbot/AIChatbot';
import { kpiData } from '@/lib/mockData';
import { TrendingUp, DollarSign, AlertTriangle, Package } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader 
          title="Dashboard" 
          subtitle="Real-time demand forecasting and inventory insights" 
        />

        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <KPICard
              title="Total Forecasted Demand"
              value={kpiData.totalDemand}
              suffix=" units"
              change={12}
              changeLabel="vs last period"
              icon={TrendingUp}
              color="primary"
              delay={0}
            />
            <KPICard
              title="Inventory Cost"
              value={kpiData.inventoryCost}
              prefix="$"
              change={-8}
              changeLabel="vs last period"
              icon={DollarSign}
              color="success"
              delay={0.1}
            />
            <KPICard
              title="Stock-out Risk"
              value={kpiData.stockoutRisk}
              suffix="%"
              change={-15}
              changeLabel="lower than last month"
              icon={AlertTriangle}
              color="warning"
              delay={0.2}
            />
            <KPICard
              title="Overstock Risk"
              value={kpiData.overstockRisk}
              suffix="%"
              change={-5}
              changeLabel="improvement"
              icon={Package}
              color="accent"
              delay={0.3}
            />
          </div>

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
