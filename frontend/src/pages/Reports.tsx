import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AIChatbot } from '@/components/chatbot/AIChatbot';
import { AISummaryCard } from '@/components/ai/AISummaryCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Calendar, TrendingUp, Package, Eye, DollarSign, AlertTriangle } from 'lucide-react';

import { useCurrency } from '@/contexts/CurrencyContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, fetchApi } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type ReportItem = {
  id: string;
  title: string;
  description: string;
  type: string;
  date: string;
  status: string;
  download_url?: string;
};

type InvRec = {
  product_id: string;
  product_name: string;
  currentStock: number;
  reorderPoint: number;
  reorderQty: number;
  safetyStock: number;
  leadTime: number;
  costSavings: number;
  riskLevel: string;
};

type InvSummary = {
  totalProducts: number;
  criticalProducts: number;
  lowProducts: number;
  healthyProducts: number;
  totalUnits: number;
  activeProducts: number;
};

const typeColors: Record<string, string> = {
  Forecast: 'bg-primary/10 text-primary',
  Inventory: 'bg-accent/10 text-accent',
  Executive: 'bg-success/10 text-success',
  Technical: 'bg-warning/10 text-warning',
  Risk: 'bg-destructive/10 text-destructive',
};

const Reports = () => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const { data: reports = [] } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiFetch<{ reports: ReportItem[] }>('/system/reports/list').then(res => res.reports),
  });

  const { data: invData } = useQuery({
    queryKey: ['inventory-list'],
    queryFn: () => apiFetch<{ summary: InvSummary; items: unknown[] }>('/inventory'),
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['inventory-optimize', 100],
    queryFn: () => apiFetch<InvRec[]>('/inventory/optimize?limit=100'),
  });

  const generateMutation = useMutation({
    mutationFn: () => apiFetch('/system/reports/generate', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const totalSavings = recommendations.reduce((sum, r) => sum + r.costSavings, 0);
  const summary = invData?.summary;
  const totalProducts = summary?.totalProducts ?? 0;
  const healthyPct = totalProducts > 0 ? Math.round((summary?.healthyProducts ?? 0) / totalProducts * 100) : 0;
  const issuesCount = recommendations.filter(r => r.riskLevel === 'high' || r.riskLevel === 'medium').length;

  const buildInventoryCsv = (recs: InvRec[]): string => {
    const header = ['product_id', 'product_name', 'currentStock', 'reorderPoint', 'reorderQty', 'safetyStock', 'leadTimeDays', 'costSavings', 'riskLevel'];
    const rows = recs.map(r => [
      r.product_id,
      `"${r.product_name}"`,
      r.currentStock,
      r.reorderPoint,
      r.reorderQty,
      r.safetyStock,
      r.leadTime,
      r.costSavings.toFixed(2),
      r.riskLevel,
    ].join(','));
    return [header.join(','), ...rows].join('\n');
  };

  const handlePreview = async (report: ReportItem) => {
    setIsPreviewLoading(true);
    setPreviewTitle(report.title);

    try {
      let text: string;

      if (report.type === 'inventory') {
        const data = await apiFetch<InvRec[]>('/inventory/optimize?limit=100');
        text = buildInventoryCsv(data);
      } else {
        const downloadPath = report.download_url || `/system/reports/download/report_${report.id}.json`;
        text = await fetchApi(downloadPath, { auth: true, responseType: 'text' }) as string;
      }

      const rows = text.split('\n').map(row => {
        return row.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
      }).filter(row => row.length > 0 && row.some(cell => cell !== ''));

      if (rows.length > 0) {
        setPreviewHeaders(rows[0]);
        setPreviewRows(rows.slice(1));
        setIsPreviewOpen(true);
      }
    } catch (err) {
      console.error('Failed to preview report:', err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDownload = async (report: ReportItem) => {
    try {
      let csv: string;
      let filename = 'report.csv';

      if (report.type === 'inventory') {
        const data = await apiFetch<InvRec[]>('/inventory/optimize?limit=100');
        csv = buildInventoryCsv(data);
        filename = 'inventory_recommendations.csv';
      } else {
        const downloadPath = report.download_url || `/system/reports/download/report_${report.id}.json`;
        csv = await fetchApi(downloadPath, { auth: true, responseType: 'text' }) as string;

        if (report.type === 'daily') filename = 'daily_operations_report.csv';
        else if (report.type === 'weekly') filename = 'weekly_performance_report.csv';
        else if (report.type === 'monthly') filename = 'monthly_performance_report.csv';
        else if (report.type === 'quarterly') filename = 'quarterly_business_review.csv';
        else if (report.type === 'yearly') filename = 'yearly_strategic_report.csv';
        else if (report.type === 'forecast') filename = 'forecast_export.csv';
      }

      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    } catch (err) {
      console.error('Failed to download report:', err);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader 
          title={t('reports:title')} 
          subtitle={t('reports:subtitle')} 
        />

        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          <AISummaryCard
            title={t('reports:qa_title')}
            sourceType="report"
            question={t('reports:qa_question')}
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            {[
              { icon: FileText, label: t('reports:stats_reports_generated'), value: String(totalProducts || reports.length), color: 'primary' },
              { icon: Download, label: t('reports:stats_downloads_this_month'), value: String(recommendations.length), color: 'accent' },
              { icon: DollarSign, label: t('reports:stats_scheduled_reports'), value: formatCurrency(totalSavings), color: 'success' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}>
                        <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 text-${stat.color}`} />
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="text-[10px] sm:text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-lg sm:text-2xl font-bold">{stat.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Reports List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-6">
                <div>
                  <CardTitle className="text-base sm:text-lg">{t('reports:available_reports_title')}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{t('reports:available_reports_description')}</CardDescription>
                </div>
                <Button 
                  className="gap-2 w-full sm:w-auto" 
                  size="sm"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                >
                  <FileText className="w-4 h-4" />
                  {generateMutation.isPending ? t('reports:generating') : t('reports:generate_new')}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {reports.map((report, index) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base truncate">{report.title}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{report.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className={`${typeColors[report.type]} text-xs`}>
                            {report.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{report.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-13 sm:ml-0 rtl:mr-13 rtl:sm:mr-0 rtl:ml-0 flex-shrink-0">
                      {report.status === 'generating' ? (
                        <Button variant="outline" disabled size="sm" className="text-xs">
                          {t('reports:generating')}
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handlePreview(report)}
                            disabled={isPreviewLoading}
                            className="gap-1 text-xs hidden sm:flex"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {isPreviewLoading && previewTitle === report.title ? t('reports:loading') : t('reports:preview')}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDownload(report)} className="text-xs">
                            {t('reports:download')}
                          </Button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Executive Report Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card className="border-primary/30">
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary text-xs">{t('reports:executive_report_badge')}</Badge>
                </div>
                <CardTitle className="text-lg sm:text-2xl">{t('reports:executive_report_title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6">
                  <div className="text-center p-3 sm:p-4 rounded-xl bg-success/5 border border-success/20">
                    <TrendingUp className="w-5 h-5 sm:w-8 sm:h-8 text-success mx-auto mb-1 sm:mb-2" />
                    <p className="text-lg sm:text-3xl font-bold text-success">{healthyPct}%</p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">{t('reports:forecast_accuracy')}</p>
                  </div>
                  <div className="text-center p-3 sm:p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <Package className="w-5 h-5 sm:w-8 sm:h-8 text-primary mx-auto mb-1 sm:mb-2" />
                    <p className="text-lg sm:text-3xl font-bold text-primary">{formatCurrency(totalSavings)}</p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">{t('reports:inventory_costs')}</p>
                  </div>
                  <div className="text-center p-3 sm:p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                    <AlertTriangle className="w-5 h-5 sm:w-8 sm:h-8 text-destructive mx-auto mb-1 sm:mb-2" />
                    <p className="text-lg sm:text-3xl font-bold text-destructive">{issuesCount}</p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">{t('reports:revenue_impact')}</p>
                  </div>
                </div>
                <p className="text-xs sm:text-base text-muted-foreground leading-relaxed">
                  {t('reports:executive_report_description')}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>

      <AIChatbot />

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col bg-card border-border">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
            <DialogDescription>{t('reports:preview_dialog_description')}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-md max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  {previewHeaders.map((header, i) => (
                    <TableHead key={i} className="font-semibold whitespace-nowrap">{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {row.map((cell, cellIdx) => (
                      <TableCell key={cellIdx} className="whitespace-nowrap">{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;
