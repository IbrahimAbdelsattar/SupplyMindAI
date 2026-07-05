import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { ReportItem, Recommendation, InventorySummary, ForecastPrediction, ReportCategory } from './types';

const TYPE_LABELS: Record<string, string> = {
  forecast: 'Forecast Reports',
  inventory: 'Inventory Reports',
  executive: 'Executive Reports',
  technical: 'Technical Reports',
  risk: 'Risk Reports',
  supply_chain: 'Supply Chain Reports',
  custom: 'Custom Reports',
};

export function useReports() {
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () =>
      apiFetch<{ reports: ReportItem[] }>('/system/reports/list').then((r) => r.reports),
  });

  const { data: invData, isLoading: invLoading } = useQuery({
    queryKey: ['inventory-list'],
    queryFn: () =>
      apiFetch<{ summary: InventorySummary; items: unknown[] }>('/inventory'),
  });

  const { data: recommendations = [], isLoading: recLoading } = useQuery({
    queryKey: ['inventory-optimize', 20],
    queryFn: () =>
      apiFetch<Recommendation[]>('/inventory/optimize?limit=20'),
  });

  const { data: products = [], isLoading: prodLoading } = useQuery({
    queryKey: ['products-list'],
    queryFn: () =>
      apiFetch<{ products: ForecastPrediction[] }>('/data/products').then((r) => r.products),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ status: string; message: string; reports: ReportItem[] }>(
        '/system/reports/generate',
        { method: 'POST' },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const generateTypeMutation = useMutation({
    mutationFn: (reportType: string) =>
      apiFetch<{ status: string; message: string; report: ReportItem }>(
        `/system/reports/generate/${reportType}`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (reportId: string) =>
      apiFetch<{ status: string; message: string }>(
        `/system/reports/${reportId}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const isLoading = reportsLoading || invLoading || recLoading || prodLoading;

  const summary = invData?.summary;
  const totalProducts = summary?.totalProducts ?? 0;
  const healthyProducts = summary?.healthyProducts ?? 0;
  const healthyPct = totalProducts > 0 ? Math.round((healthyProducts / totalProducts) * 100) : 0;
  const totalSavings = recommendations.reduce((s, r) => s + (r.costSavings || 0), 0);
  const issuesCount = recommendations.filter(
    (r) => r.riskLevel === 'high' || r.riskLevel === 'medium',
  ).length;
  const criticalCount = recommendations.filter((r) => r.riskLevel === 'critical').length;

  const totalReportsSize = reports.reduce((s, r) => s + (r.file_size || 0), 0);
  const formattedTotalSize =
    totalReportsSize < 1024 * 1024
      ? `${(totalReportsSize / 1024).toFixed(1)} KB`
      : `${(totalReportsSize / (1024 * 1024)).toFixed(1)} MB`;

  const categories: ReportCategory[] = Object.entries(TYPE_LABELS).map(([key, label]) => {
    const matching = reports.filter((r) => r.type === key);
    return {
      key,
      label,
      count: matching.length,
      lastGenerated: matching.length > 0 ? matching[0].generated_at : undefined,
      totalSize: matching.reduce((s, r) => s + (r.file_size || 0), 0),
    };
  });

  const activeCategories = categories.filter((c) => c.count > 0);

  return {
    reports,
    recommendations,
    products,
    summary,
    isLoading,
    generateMutation,
    generateTypeMutation,
    deleteMutation,
    totalProducts,
    healthyPct,
    totalSavings,
    issuesCount,
    criticalCount,
    totalReportsSize,
    formattedTotalSize,
    categories,
    activeCategories,
    reportsLoading,
  };
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const TYPE_COLORS: Record<string, string> = {
  forecast: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  inventory: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  executive: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  technical: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  risk: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  supply_chain: 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400',
  custom: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
};
