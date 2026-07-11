import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, Clock, Package, Truck, FileText } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { useCurrency } from '@/contexts/CurrencyContext';

type POStatus = 'created' | 'approved' | 'received';

type PurchaseOrder = {
  po_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  notes: string;
  status: POStatus;
  created_at: string;
  created_by: string;
};

const STATUS_CONFIG: Record<POStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  created: { label: 'Created', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  received: { label: 'Received', icon: Truck, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
};

const PurchaseOrders = () => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      return apiFetch<{ items: PurchaseOrder[]; total: number }>(`/inventory/purchase-orders${params}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ poId, action }: { poId: string; action: 'approve' | 'receive' }) =>
      apiFetch<{ success: boolean; status: string }>(`/inventory/purchase-orders/${poId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      toast({
        title: t('poList.toast.updated'),
        description: t('poList.toast.statusChanged', { id: result.po_id, status: result.status }),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('poList.toast.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const items = data?.items ?? [];

  // Summary counts
  const counts = { created: 0, approved: 0, received: 0 };
  items.forEach((po) => { counts[po.status]++; });

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t('poList.title')}</h1>
              <p className="text-muted-foreground">{t('poList.subtitle')}</p>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('poList.filter.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('poList.filter.all')}</SelectItem>
                <SelectItem value="created">{t('poList.filter.created')}</SelectItem>
                <SelectItem value="approved">{t('poList.filter.approved')}</SelectItem>
                <SelectItem value="received">{t('poList.filter.received')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['created', 'approved', 'received'] as const).map((status) => {
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              return (
                <Card key={status} className={`${cfg.bgColor} border`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Icon className={`w-8 h-8 ${cfg.color}`} />
                    <div>
                      <p className="text-2xl font-bold">{counts[status]}</p>
                      <p className="text-sm text-muted-foreground">{cfg.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* PO Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('poList.table.title')}
              </CardTitle>
              <CardDescription>{t('poList.table.description', { total: items.length })}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </motion.div>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>{t('poList.table.empty')}</p>
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('poList.table.poId')}</TableHead>
                        <TableHead>{t('poList.table.product')}</TableHead>
                        <TableHead className="text-right">{t('poList.table.qty')}</TableHead>
                        <TableHead className="text-right">{t('poList.table.unitCost')}</TableHead>
                        <TableHead className="text-right">{t('poList.table.total')}</TableHead>
                        <TableHead>{t('poList.table.status')}</TableHead>
                        <TableHead>{t('poList.table.date')}</TableHead>
                        <TableHead>{t('poList.table.createdBy')}</TableHead>
                        <TableHead className="text-right">{t('poList.table.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {items.map((po) => {
                          const cfg = STATUS_CONFIG[po.status];
                          const Icon = cfg.icon;
                          return (
                            <motion.tr
                              key={po.po_id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              className="group"
                            >
                              <TableCell className="font-mono text-sm font-semibold">{po.po_id}</TableCell>
                              <TableCell>{po.product_id}</TableCell>
                              <TableCell className="text-right">{po.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(po.unit_cost)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(po.total_cost)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`${cfg.bgColor} ${cfg.color} border gap-1`}>
                                  <Icon className="w-3 h-3" />
                                  {cfg.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {po.created_at ? new Date(po.created_at).toLocaleDateString() : '—'}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{po.created_by || '—'}</TableCell>
                              <TableCell className="text-right">
                                {po.status === 'created' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                    disabled={updateMutation.isPending}
                                    onClick={() => updateMutation.mutate({ poId: po.po_id, action: 'approve' })}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    {t('poList.actions.approve')}
                                  </Button>
                                )}
                                {po.status === 'approved' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                    disabled={updateMutation.isPending}
                                    onClick={() => updateMutation.mutate({ poId: po.po_id, action: 'receive' })}
                                  >
                                    <Truck className="w-4 h-4 mr-1" />
                                    {t('poList.actions.receive')}
                                  </Button>
                                )}
                                {po.status === 'received' && (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default PurchaseOrders;
