import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { TrendingUp, DollarSign, AlertTriangle, Package } from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { KPICard } from '@/components/dashboard/KPICard';

export type KPIResponse = {
  totalDemand: number;
  inventoryCost: number;
  stockoutRisk: number;
  overstockRisk: number;
  revenue: number;
  accuracy: number;
};

function normalizeNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function KPIErrorCard({ message }: { message: string }) {
  return (
    <div className="neu-card rounded-3xl p-6" role="alert">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-destructive" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-foreground">Unable to load KPIs</h3>
          <p className="text-sm text-muted-foreground mt-1 break-words">{message}</p>
          <p className="text-xs text-muted-foreground/80 mt-2">
            Check backend availability and API base URL (VITE_API_URL / proxy to /api).
          </p>
        </div>
      </div>
    </div>
  );
}

function KPISkeletonGrid() {
  const skeleton = (
    <div className="rounded-3xl p-5 sm:p-7 h-full neu-card">
      <div className="h-4 w-2/3 rounded bg-muted/30 animate-pulse" />
      <div className="h-12 w-3/5 mt-4 rounded bg-muted/30 animate-pulse" />
      <div className="h-4 w-1/2 mt-3 rounded bg-muted/20 animate-pulse" />
    </div>
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>{skeleton}</div>
      ))}
    </div>
  );
}

export const DashboardKPIGrid = ({ periodDays }: { periodDays: 1 | 7 | 30 | 90 }) => {
  const { t } = useTranslation();
  const { convertCurrency, currencySymbol } = useCurrency();

  const { data, error, isLoading, isError } = useQuery({
    queryKey: ['kpis', periodDays],
    queryFn: () => apiFetch<KPIResponse>(`/data/kpis?period_days=${periodDays}`),
    retry: false,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    placeholderData: {
      totalDemand: 12500,
      inventoryCost: 450000,
      stockoutRisk: 12.5,
      overstockRisk: 8.2,
      revenue: 850000,
      accuracy: 94.5,
    },
  });

  if (isLoading) return <KPISkeletonGrid />;

  if (isError) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return <KPIErrorCard message={message} />;
  }

  const kpi = data;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 overflow-hidden">
      <KPICard
        title={t('dashboard:kpi.totalDemand')}
        value={normalizeNumber(kpi?.totalDemand)}
        suffix={t('dashboard:kpi.unitsSuffix')}
        icon={TrendingUp}
        color="primary"
        index={0}
      />

      <KPICard
        title={t('dashboard:kpi.inventoryCost')}
        value={convertCurrency(normalizeNumber(kpi?.inventoryCost))}
        prefix={currencySymbol}
        icon={DollarSign}
        color="success"
        index={1}
      />

      <KPICard
        title={t('dashboard:kpi.stockoutRisk')}
        value={normalizeNumber(kpi?.stockoutRisk)}
        suffix={t('dashboard:kpi.percentSuffix')}
        icon={AlertTriangle}
        color="warning"
        index={2}
      />

      <KPICard
        title={t('dashboard:kpi.overstockRisk')}
        value={normalizeNumber(kpi?.overstockRisk)}
        suffix={t('dashboard:kpi.percentSuffix')}
        icon={Package}
        color="accent"
        index={3}
      />
    </div>
  );
};

