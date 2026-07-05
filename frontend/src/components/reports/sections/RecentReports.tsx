import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FileText, Eye, Download, Clock, Trash2 } from 'lucide-react';
import { SectionHeader } from '../shared/SectionHeader';
import { TYPE_COLORS, formatFileSize, formatDate, type ReportItem } from '../data/useReportsHook';
import { useToast } from '@/hooks/use-toast';
import { fetchApi } from '@/lib/api';
import type { UseMutationResult } from '@tanstack/react-query';
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

interface Props {
  reports: ReportItem[];
  deleteMutation: UseMutationResult<{ status: string; message: string }, Error, string>;
}

const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'forecast', label: 'Forecast' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'executive', label: 'Executive' },
  { key: 'technical', label: 'Technical' },
  { key: 'supply_chain', label: 'Supply Chain' },
  { key: 'custom', label: 'Custom' },
];

export function RecentReports({ reports, deleteMutation }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredReports = useMemo(() => {
    if (activeFilter === 'all') return reports;
    return reports.filter((r) => r.type === activeFilter);
  }, [reports, activeFilter]);

  const handlePreview = async (report: ReportItem) => {
    setPreviewLoading(true);
    setPreviewTitle(report.title);
    try {
      const downloadPath = report.download_url || `/system/reports/download/${report.id}.csv`;
      const text = (await fetchApi(downloadPath, { responseType: 'text' })) as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
      const parsed: string[][] = [];
      for (const line of lines) {
        let insideQuote = false;
        const entries: string[] = [];
        let entry = '';
        for (const char of line) {
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
        if (entries.length > 0 && entries.some((e) => e !== '')) parsed.push(entries);
      }
      if (parsed.length > 0) {
        setPreviewHeaders(parsed[0]);
        setPreviewRows(parsed.slice(1));
        setIsPreviewOpen(true);
      } else {
        toast({ title: t('common:error', 'Error'), description: 'Report data is empty.', variant: 'destructive' });
      }
    } catch (err) {
      toast({
        title: t('common:error', 'Error'),
        description: err instanceof Error ? err.message : 'Failed to load preview.',
        variant: 'destructive',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (report: ReportItem) => {
    try {
      const downloadPath = report.download_url || `/system/reports/download/${report.id}.csv`;
      const text = (await fetchApi(downloadPath, { responseType: 'text' })) as string;
      const filename = `${report.title.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase()}.csv`;
      const blob = new Blob([text], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      toast({ title: t('common:success', 'Success'), description: `Downloaded ${report.title}.` });
    } catch (err) {
      toast({
        title: t('common:error', 'Error'),
        description: err instanceof Error ? err.message : 'Failed to download.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (reportId: string) => {
    deleteMutation.mutate(reportId, {
      onSuccess: () => {
        toast({ title: t('common:success', 'Success'), description: 'Report deleted.' });
        setDeleteConfirmId(null);
      },
      onError: (err) => {
        toast({
          title: t('common:error', 'Error'),
          description: err instanceof Error ? err.message : 'Failed to delete.',
          variant: 'destructive',
        });
      },
    });
  };

  const recent = filteredReports.slice(0, 10);

  return (
    <section aria-label="Recent reports">
      <SectionHeader
        title="Recent Reports"
        subtitle={`${reports.length} reports available`}
        icon={<Clock className="w-4 h-4" />}
      />
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 p-5">
        {reports.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No reports generated yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Generate your first report above</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 mb-4" role="tablist" aria-label="Filter by report type">
              {TYPE_FILTERS.map((tf) => {
                const count = tf.key === 'all' ? reports.length : reports.filter((r) => r.type === tf.key).length;
                if (tf.key !== 'all' && count === 0) return null;
                return (
                  <button
                    key={tf.key}
                    role="tab"
                    aria-selected={activeFilter === tf.key}
                    onClick={() => setActiveFilter(tf.key)}
                    className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      activeFilter === tf.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {tf.label}
                    <span className="ml-1 opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
            <div className="space-y-2">
              {recent.map((report, idx) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-400/40 dark:hover:border-blue-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{report.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                        {report.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${TYPE_COLORS[report.type] || TYPE_COLORS.custom}`}>
                          {report.type}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatDate(report.generated_at)}</span>
                        {report.file_size ? (
                          <span className="text-[10px] text-slate-400">{formatFileSize(report.file_size)}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-13 sm:ml-0">
                    <button
                      onClick={() => handlePreview(report)}
                      disabled={previewLoading}
                      className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      aria-label={`Preview ${report.title}`}
                    >
                      <Eye className="w-3 h-3" />
                      {previewLoading && previewTitle === report.title ? '...' : 'Preview'}
                    </button>
                    <button
                      onClick={() => handleDownload(report)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      aria-label={`Download ${report.title}`}
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(report.id)}
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                      aria-label={`Delete ${report.title}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
              {recent.length === 0 && activeFilter !== 'all' && (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500 dark:text-slate-400">No reports of this type</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
            <DialogDescription>CSV preview — first 50 rows</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-700 rounded-md max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  {previewHeaders.map((h, i) => (
                    <TableHead key={i} className="font-semibold whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.slice(0, 50).map((row, ri) => (
                  <TableRow key={ri}>
                    {row.map((cell, ci) => (
                      <TableCell key={ci} className="whitespace-nowrap text-xs">{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle>Delete Report</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
