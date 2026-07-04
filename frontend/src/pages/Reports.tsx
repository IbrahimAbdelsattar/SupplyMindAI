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
import { useToast } from '@/hooks/use-toast';
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
  format?: string;
  date?: string;
  generated_at?: string;
  status: string;
  file_size?: number;
  download_url?: string;
  period_start?: string;
  period_end?: string;
};

const typeColors: Record<string, string> = {
  forecast: 'bg-primary/10 text-primary',
  inventory: 'bg-accent/10 text-accent',
  executive: 'bg-success/10 text-success',
  technical: 'bg-warning/10 text-warning',
  risk: 'bg-destructive/10 text-destructive',
  supply_chain: 'bg-indigo-500/10 text-indigo-400',
};

const Reports = () => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();

  const { toast } = useToast();

  const { data: reports = [] } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiFetch<{ reports: ReportItem[] }>('/system/reports/list').then(res => res.reports),
  });

  const { data: invData } = useQuery({
    queryKey: ['inventory-list'],
    queryFn: () => apiFetch<{ summary: { totalProducts: number; healthyProducts: number }; items: unknown[] }>('/inventory'),
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['inventory-optimize', 100],
    queryFn: () => apiFetch<{ costSavings: number; riskLevel: string }[]>('/inventory/optimize?limit=100'),
  });

  const generateMutation = useMutation({
    mutationFn: () => apiFetch<{ status: string; message: string }>('/system/reports/generate', { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast({
        title: t('common:success', 'Success'),
        description: data.message || 'New reports generated successfully.',
      });
    },
    onError: (err) => {
      toast({
        title: t('common:error', 'Error'),
        description: err instanceof Error ? err.message : 'Failed to generate reports',
        variant: 'destructive',
      });
    },
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const totalSavings = recommendations.reduce((sum, r) => sum + r.costSavings, 0);
  const summary = invData?.summary;
  const totalProducts = summary?.totalProducts ?? 0;
  const healthyPct = totalProducts > 0 ? Math.round((summary?.healthyProducts ?? 0) / totalProducts * 100) : 0;
  const issuesCount = recommendations.filter(r => r.riskLevel === 'high' || r.riskLevel === 'medium').length;

  const totalReportsSize = reports.reduce((sum, r) => sum + (r.file_size || 0), 0);
  const formattedTotalSize = totalReportsSize < 1024 * 1024
    ? `${(totalReportsSize / 1024).toFixed(1)} KB`
    : `${(totalReportsSize / (1024 * 1024)).toFixed(1)} MB`;

  const handlePreview = async (report: ReportItem) => {
    setIsPreviewLoading(true);
    setPreviewTitle(report.title);

    try {
      const downloadPath = report.download_url || `/system/reports/download/${report.id}.csv`;
      const text = await fetchApi(downloadPath, { auth: true, responseType: 'text' }) as string;

      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      const parsedRows: string[][] = [];
      for (const line of lines) {
        let insideQuote = false;
        let entries: string[] = [];
        let entry = '';
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            insideQuote = !insideQuote;
          } else if (char === ',' && !insideQuote) {
            entries.push(entry.trim().replace(/^"|"$/g, ''));
            entry = '';
          } else {
            entry += char;
          }
        }
        entries.push(entry.trim().replace(/^"|"$/g, ''));
        if (entries.length > 0 && entries.some(e => e !== '')) {
          parsedRows.push(entries);
        }
      }

      if (parsedRows.length > 0) {
        setPreviewHeaders(parsedRows[0]);
        setPreviewRows(parsedRows.slice(1));
        setIsPreviewOpen(true);
      } else {
        toast({
          title: t('common:error', 'Error'),
          description: 'The report data is empty or invalid.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Failed to preview report:', err);
      toast({
        title: t('common:error', 'Error'),
        description: err instanceof Error ? err.message : 'Failed to load report preview.',
        variant: 'destructive',
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDownload = async (report: ReportItem) => {
    try {
      const downloadPath = report.download_url || `/system/reports/download/${report.id}.csv`;
      const text = await fetchApi(downloadPath, { auth: true, responseType: 'text' }) as string;

      const ext = report.format === 'csv' ? 'csv' : 'csv';
      const filename = `${report.title.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase()}.${ext}`;

      const blob = new Blob([text], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();

      toast({
        title: t('common:success', 'Success'),
        description: `Successfully downloaded ${report.title}.`,
      });
    } catch (err) {
      console.error('Failed to download report:', err);
      toast({
        title: t('common:error', 'Error'),
        description: err instanceof Error ? err.message : 'Failed to download report.',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
              { icon: FileText, label: t('reports:stats_reports_generated'), value: String(reports.length), color: 'primary' },
              { icon: Download, label: t('reports:stats_downloads_this_month'), value: "CSV / JSON", color: 'accent' },
              { icon: DollarSign, label: t('reports:stats_scheduled_reports'), value: formattedTotalSize, color: 'success' },
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
                          <Badge variant="outline" className={`${typeColors[report.type] || 'bg-muted text-muted-foreground'} text-xs`}>
                            {report.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {report.generated_at ? new Date(report.generated_at).toLocaleDateString() : report.date || ''}
                          </span>
                          {report.file_size ? (
                            <span className="text-xs text-muted-foreground">{formatFileSize(report.file_size)}</span>
                          ) : null}
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
