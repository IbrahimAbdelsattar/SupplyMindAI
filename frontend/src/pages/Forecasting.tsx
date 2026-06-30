import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AIChatbot } from '@/components/chatbot/AIChatbot';
import { AISummaryCard } from '@/components/ai/AISummaryCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Legend,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Calendar, Package } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useCurrency } from '@/contexts/CurrencyContext';

type Product = { product_id: string; product_name: string; category?: string };
type ForecastPoint = { date: string; actual?: number | null; forecast: number; lower: number; upper: number };
type MonthlyPrediction = { period: string; predicted_demand: number; confidence_level: number; demand_trend: string; revenue_forecast?: number | null };
type ForecastResponse = { product_id: string; horizon_days: number; series: ForecastPoint[]; monthly_summary?: MonthlyPrediction[] | null };

const HORIZON_OPTIONS = [
  { labelKey: 'forecasting:horizon.1month', value: 30 },
  { labelKey: 'forecasting:horizon.3months', value: 90 },
  { labelKey: 'forecasting:horizon.6months', value: 180 },
];

const Forecasting = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch<Product[]>('/data/products'),
  });

  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [horizon, setHorizon] = useState('90');

  useMemo(() => {
    if (!selectedProduct && products?.[0]?.product_id) setSelectedProduct(products[0].product_id);
  }, [products, selectedProduct]);

  const forecastMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) return null;
      return apiFetch<ForecastResponse>('/forecast/predict', {
        method: 'POST',
        body: JSON.stringify({ product_id: selectedProduct, horizon_days: parseInt(horizon) }),
      });
    },
  });

  const chartData = useMemo(() => forecastMutation.data?.series ?? [], [forecastMutation.data]);
  const monthlyData = useMemo(() => forecastMutation.data?.monthly_summary ?? [], [forecastMutation.data]);

  const summary = useMemo(() => {
    if (!monthlyData.length) return null;
    const totalDemand = monthlyData.reduce((s, m) => s + m.predicted_demand, 0);
    const avgConfidence = monthlyData.reduce((s, m) => s + m.confidence_level, 0) / monthlyData.length;
    const latestTrend = monthlyData[monthlyData.length - 1]?.demand_trend ?? 'stable';
    const totalRevenue = monthlyData.reduce((s, m) => s + (m.revenue_forecast ?? 0), 0);
    return { totalDemand, avgConfidence, latestTrend, totalRevenue };
  }, [monthlyData]);

  useEffect(() => {
    void forecastMutation.mutateAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct, horizon]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleExport = () => {
    const csv = chartData
      .map((row) => `${row.date},${row.actual || ''},${row.forecast},${row.lower},${row.upper}`)
      .join('\n');
    const header = 'Date,Actual,Forecast,Lower,Upper\n';
    const blob = new Blob([header + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'forecast_export.csv';
    a.click();
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader 
          title={t('forecasting:title')} 
          subtitle={t('forecasting:subtitle')} 
        />

        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">{t('forecasting:parameters.title')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{t('forecasting:parameters.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-lg">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs sm:text-sm">
                      <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {t('forecasting:product')}
                    </Label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger className="bg-background h-9 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {(products ?? []).map((product) => (
                          <SelectItem key={product.product_id} value={product.product_id}>
                            {product.product_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs sm:text-sm">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {t('forecasting:horizonLabel')}
                    </Label>
                    <Select value={horizon} onValueChange={setHorizon}>
                      <SelectTrigger className="bg-background h-9 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {HORIZON_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {t(opt.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Summary Cards */}
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">{t('forecasting:kpi.forecastDemand')}</CardDescription>
                  <CardTitle className="text-xl sm:text-2xl">
                    {summary.totalDemand.toLocaleString()}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{t('forecasting:kpi.units')}</p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">{t('forecasting:kpi.confidenceLevel')}</CardDescription>
                  <CardTitle className="text-xl sm:text-2xl">
                    {Math.round(summary.avgConfidence)}%
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{t('forecasting:kpi.confidenceLevelDesc')}</p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">{t('forecasting:kpi.demandTrend')}</CardDescription>
                  <CardTitle className="text-xl sm:text-2xl capitalize">
                    {summary.latestTrend}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{t('forecasting:kpi.demandTrendDesc')}</p>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">{t('forecasting:kpi.revenueForecast')}</CardDescription>
                  <CardTitle className="text-xl sm:text-2xl">
                    {summary.totalRevenue > 0
                      ? formatCurrency(summary.totalRevenue)
                      : '—'}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {summary.totalRevenue > 0 ? t('forecasting:kpi.revenueForecastDesc') : t('forecasting:kpi.revenueForecastNa')}
                  </p>
                </CardHeader>
              </Card>
            </motion.div>
          )}

          {selectedProduct && (
            <AISummaryCard
              title={t('forecasting:aiExplanation.title')}
              productId={selectedProduct}
              sourceType="forecast"
              question={`Explain forecast changes and drivers for product ${selectedProduct}. What should planners watch next?`}
            />
          )}

          {/* Forecast Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-6">
                <div>
                  <CardTitle className="text-base sm:text-lg">{t('forecasting:chart.title')}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{t('forecasting:chart.description')}</CardDescription>
                </div>
                <Button onClick={handleExport} variant="outline" className="gap-2 w-full sm:w-auto" size="sm">
                  <Download className="w-4 h-4" />
                  {t('forecasting:exportCsv')}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-60 sm:h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <defs>
                        <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} width={40} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Area
                        type="monotone"
                        dataKey="upper"
                        stroke="none"
                        fill="url(#confidenceGradient)"
                        name={t('forecasting:chart.upperBound')}
                      />
                      <Area
                        type="monotone"
                        dataKey="lower"
                        stroke="none"
                        fill="hsl(var(--background))"
                        name={t('forecasting:chart.lowerBound')}
                      />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="hsl(var(--accent))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--accent))', strokeWidth: 0, r: 3 }}
                        name={t('forecasting:chart.actual')}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                        name={t('forecasting:chart.forecast')}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Monthly Forecast Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">{t('forecasting:table.title')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{t('forecasting:table.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-auto -mx-3 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">{t('forecasting:table.period')}</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">{t('forecasting:table.forecast')}</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">{t('forecasting:table.confidence')}</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">{t('forecasting:table.trend')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                            {new Date(row.period + '-01').toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                            })}
                          </TableCell>
                          <TableCell className="text-right font-medium text-primary text-xs sm:text-sm">
                            {row.predicted_demand.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-xs sm:text-sm">
                            {row.confidence_level}%
                          </TableCell>
                          <TableCell className="text-right text-xs sm:text-sm capitalize">
                            {row.demand_trend}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!monthlyData.length && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground text-xs sm:text-sm py-8">
                            {t('forecasting:table.empty')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>

      <AIChatbot />
    </div>
  );
};

export default Forecasting;
