import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
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
import { Boxes, Download, Calendar, Package, Brain, Loader2, Sparkles } from 'lucide-react';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { consumeSSE } from '@/lib/stream';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCompactNumber } from '@/lib/currency';
import { FORECAST_HORIZONS, forecastHorizon, forecastSelection } from '@/lib/materialPlanning';

// Types for forecast reasoning
interface ForecastReasoningRisk {
  title: string;
  description: string;
  impact?: string;
}
interface ForecastReasoningRecommendation {
  title: string;
  description: string;
  impact?: string;
}
interface ForecastReasoningOpportunity {
  title: string;
  description: string;
  value?: string;
}
interface ForecastReasoningResult {
  summary: string;
  risks: ForecastReasoningRisk[];
  recommendations: ForecastReasoningRecommendation[];
  revenue_opportunities: ForecastReasoningOpportunity[];
}

type Product = { product_id: string; product_name: string; category?: string };
type ForecastPoint = { date: string; actual?: number | null; forecast: number | null; lower: number | null; upper: number | null };
type MonthlyPrediction = { period: string; predicted_demand: number; confidence_level: number | null; demand_trend: string | null; revenue_forecast?: number | null };
type ForecastResponse = { product_id: string; horizon_days: number; series: ForecastPoint[]; monthly_summary?: MonthlyPrediction[] | null };

const Forecasting = () => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();


  /* ── Forecast reasoning streaming state ── */
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [streamTokens, setStreamTokens] = useState('');
  const [streamResult, setStreamResult] = useState<ForecastReasoningResult | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch<Product[]>('/data/products'),
  });

  const [params, setParams] = useSearchParams();
  const requestedProduct = params.get('product');
  const selectedProduct = products?.find((product) => product.product_id === requestedProduct)?.product_id
    ?? products?.[0]?.product_id ?? '';
  const horizon = forecastHorizon(params.get('horizon'), '90');

  const forecastQuery = useQuery({
    queryKey: ['forecast', selectedProduct, horizon],
    queryFn: ({ signal }) => apiFetch<ForecastResponse>('/forecast/predict', {
      method: 'POST',
      body: JSON.stringify({ product_id: selectedProduct, horizon_days: Number(horizon) }),
      signal,
    }),
    enabled: !!selectedProduct,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Load cached forecast analysis on product or horizon change
  useEffect(() => {
    if (!selectedProduct) return;
    const cacheKey = `forecast-analysis-cache-${selectedProduct}-${horizon}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setStreamResult(parsed.result);
        setElapsedMs(parsed.elapsedMs);
      } catch (e) {
        console.warn('Failed to parse cached forecast analysis', e);
      }
    } else {
      setStreamResult(null);
      setElapsedMs(null);
    }
    setStreamStatus(null);
    setStreamTokens('');
    setStreamError(null);
  }, [selectedProduct, horizon]);

  /* ── Forecast reasoning stream ── */
  const generateForecastAnalysis = useCallback(() => {
    if (!forecastQuery.data?.monthly_summary?.length) {
      return;
    }

    setStreamStatus(null);
    setStreamTokens('');
    setStreamResult(null);
    setStreamError(null);
    setElapsedMs(null);
    setIsStreaming(true);

    // Build forecasts array from monthly_summary
    const monthlyData = forecastQuery.data.monthly_summary ?? [];

    consumeSSE<ForecastReasoningResult>('/forecast/reasoning/stream', {
      method: 'POST',
      body: JSON.stringify({
        forecasts: monthlyData,
      }),
      callbacks: {
        onStart: () => setStreamStatus('Starting forecast analysis...'),
        onStatus: (msg) => setStreamStatus(msg),
        onToken: (tok) => setStreamTokens((prev) => prev + tok),
        onResult: (res) => {
          setStreamResult(res);
          // Cache results immediately
          if (selectedProduct) {
            localStorage.setItem(
              `forecast-analysis-cache-${selectedProduct}-${horizon}`,
              JSON.stringify({ result: res, elapsedMs: null })
            );
          }
        },
        onError: (msg) => setStreamError(msg),
        onDone: (meta) => {
          setIsStreaming(false);
          const elapsed = meta?.elapsed_ms ?? null;
          setElapsedMs(elapsed);

          // Update cache with final elapsedMs
          if (selectedProduct) {
            const cacheKey = `forecast-analysis-cache-${selectedProduct}-${horizon}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                parsed.elapsedMs = elapsed;
                localStorage.setItem(cacheKey, JSON.stringify(parsed));
              } catch (e) { /* ignore */ }
            }
          }
        },
      },
    });
  }, [forecastQuery.data, selectedProduct, horizon]);

  const chartData = useMemo(() => forecastQuery.data?.series ?? [], [forecastQuery.data]);
  const monthlyData = useMemo(() => forecastQuery.data?.monthly_summary ?? [], [forecastQuery.data]);

  const summary = useMemo(() => {
    if (!monthlyData.length) return null;
    const totalDemand = monthlyData.reduce((s, m) => s + m.predicted_demand, 0);
    const confidence = monthlyData.flatMap((month) => month.confidence_level === null ? [] : [month.confidence_level]);
    const avgConfidence = confidence.length ? confidence.reduce((sum, value) => sum + value, 0) / confidence.length : null;
    const latestTrend = monthlyData[monthlyData.length - 1]?.demand_trend;
    const totalRevenue = monthlyData.reduce((s, m) => s + (m.revenue_forecast ?? 0), 0);
    return { totalDemand, avgConfidence, latestTrend, totalRevenue };
  }, [monthlyData]);

  const handleExport = () => {
    const csv = chartData
      .map((row) => `${row.date},${row.actual ?? ''},${row.forecast ?? ''},${row.lower ?? ''},${row.upper ?? ''}`)
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
                    <Select value={selectedProduct} onValueChange={(product) => setParams(forecastSelection(product, horizon), { replace: true })}>
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
                    <Select value={horizon} onValueChange={(value) => setParams(forecastSelection(selectedProduct, value), { replace: true })}>
                      <SelectTrigger className="bg-background h-9 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {FORECAST_HORIZONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {t(opt.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {selectedProduct && (
                  <Button asChild size="sm" variant="outline" className="mt-4">
                    <Link to={{ pathname: '/bom', search: forecastSelection(selectedProduct, horizon).toString() }}>
                      <Boxes aria-hidden="true" />
                      {t('bom:planLink')}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {forecastQuery.isError && (
            <div className="flex flex-wrap items-center gap-3">
              <p role="alert" className="text-sm text-destructive">{t('forecasting:forecastError')}</p>
              <Button size="sm" variant="outline" onClick={() => void forecastQuery.refetch()}>{t('bom:retry')}</Button>
            </div>
          )}

          {/* Summary Cards */}
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
            >
              <Card className="flex flex-col min-h-[110px]">
                <CardHeader className="pb-2 flex-1 flex flex-col justify-between">
                  <CardDescription className="text-xs truncate">{t('forecasting:kpi.forecastDemand')}</CardDescription>
                  <CardTitle className="text-xl sm:text-2xl truncate" title={summary.totalDemand.toLocaleString()}>
                    {formatCompactNumber(summary.totalDemand)}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground truncate">{t('forecasting:kpi.units')}</p>
                </CardHeader>
              </Card>
              <Card className="flex flex-col min-h-[110px]">
                <CardHeader className="pb-2 flex-1 flex flex-col justify-between">
                  <CardDescription className="text-xs truncate">{t('forecasting:kpi.confidenceLevel')}</CardDescription>
                  <CardTitle className="text-xl sm:text-2xl truncate">
                    {summary.avgConfidence === null ? '—' : `${Math.round(summary.avgConfidence)}%`}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground truncate">{t('forecasting:kpi.confidenceLevelDesc')}</p>
                </CardHeader>
              </Card>
              <Card className="flex flex-col min-h-[110px]">
                <CardHeader className="pb-2 flex-1 flex flex-col justify-between">
                  <CardDescription className="text-xs truncate">{t('forecasting:kpi.demandTrend')}</CardDescription>
                  <CardTitle className="text-xl sm:text-2xl capitalize truncate">
                    {summary.latestTrend ?? '—'}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground truncate">{t('forecasting:kpi.demandTrendDesc')}</p>
                </CardHeader>
              </Card>
              <Card className="flex flex-col min-h-[110px]">
                <CardHeader className="pb-2 flex-1 flex flex-col justify-between">
                  <CardDescription className="text-xs truncate">{t('forecasting:kpi.revenueForecast')}</CardDescription>
                  <CardTitle className="text-xl sm:text-2xl truncate" title={summary.totalRevenue > 0 ? formatCurrency(summary.totalRevenue) : ''}>
                    {summary.totalRevenue > 0
                      ? formatCurrency(summary.totalRevenue, true) // Using true for compact format
                      : '—'}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground truncate">
                    {summary.totalRevenue > 0 ? t('forecasting:kpi.revenueForecastDesc') : t('forecasting:kpi.revenueForecastNa')}
                  </p>
                </CardHeader>
              </Card>
            </motion.div>
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
                        type="stepAfter"
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

          {/* ── AI Analysis (streaming) ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <Card className="border-primary/30 bg-primary/[0.02] overflow-hidden">
              <CardHeader className="pb-3 sm:pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base sm:text-lg">AI Forecast Analysis</CardTitle>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    Deep-dive LLM analysis of forecast trends, risks, and opportunities
                  </CardDescription>
                </div>
                <Button
                  onClick={generateForecastAnalysis}
                  disabled={isStreaming || !forecastQuery.data?.monthly_summary?.length}
                  className="flex items-center gap-2 flex-shrink-0"
                  size="sm"
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isStreaming ? 'Analyzing...' : 'Generate AI Analysis'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Streaming status */}
                {isStreaming && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-xs text-primary font-medium">{streamStatus}</span>
                  </div>
                )}
                {isStreaming && streamTokens && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border max-h-40 overflow-y-auto">
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {streamTokens}
                    </p>
                  </div>
                )}
                {streamError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-xs text-destructive">{streamError}</p>
                  </div>
                )}
                {elapsedMs != null && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full inline-block">
                    {(elapsedMs / 1000).toFixed(1)}s
                  </span>
                )}

                {/* Result sections */}
                {streamResult?.summary && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Executive Summary</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {streamResult.summary}
                    </p>
                  </div>
                )}
                {streamResult?.risks && streamResult.risks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Key Risks</h4>
                    <ul className="space-y-1">
                      {streamResult.risks.map((risk, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                          <span className="w-5 h-5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span><strong>{risk.title}</strong>{risk.description ? `: ${risk.description}` : ''}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {streamResult?.recommendations && streamResult.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Recommendations</h4>
                    <ul className="space-y-1">
                      {streamResult.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                          <span className="w-5 h-5 rounded-full bg-success/10 text-success text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span><strong>{rec.title}</strong>{rec.description ? `: ${rec.description}` : ''}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {streamResult?.revenue_opportunities && streamResult.revenue_opportunities.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Revenue Opportunities</h4>
                    <ul className="space-y-1">
                      {streamResult.revenue_opportunities.map((opp, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span><strong>{opp.title}</strong>{opp.description ? `: ${opp.description}` : ''}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Monthly Forecast Table ── */}
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
                            {row.confidence_level === null ? '—' : `${row.confidence_level}%`}
                          </TableCell>
                          <TableCell className="text-right text-xs sm:text-sm capitalize">
                            {row.demand_trend ?? '—'}
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

    </div>
  );
};

export default Forecasting;
