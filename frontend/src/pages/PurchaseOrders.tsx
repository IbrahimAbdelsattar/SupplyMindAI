import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent } from '@/components/ui/card';
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
  created: { label: 'Created', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100/50 dark:bg-amber-950/30' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100/50 dark:bg-blue-950/30' },
  received: { label: 'Received', icon: Truck, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100/50 dark:bg-emerald-950/30' },
};

const PurchaseOrders = () => {
  const { t } = useTranslation('inventory');
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => apiFetch<{ items: PurchaseOrder[]; total: number }>(`/inventory/purchase-orders`),
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

  const allItems = data?.items ?? [];
  const filteredItems = statusFilter === 'all' 
    ? allItems 
    : allItems.filter(po => po.status === statusFilter);

  // Summary counts across ALL items
  const counts = { created: 0, approved: 0, received: 0 };
  allItems.forEach((po) => { counts[po.status]++; });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader 
          title={t('poList.title')} 
          subtitle={t('poList.subtitle')} 
        />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Header Controls */}
          <div className="flex justify-end">
            <div className="w-[180px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-card">
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
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {(['created', 'approved', 'received'] as const).map((status, idx) => {
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={status}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.1 }}
                >
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cfg.bgColor}`}>
                          <Icon className={`w-6 h-6 ${cfg.color}`} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
                            {cfg.label}
                          </p>
                          <p className="text-2xl font-bold text-foreground">
                            {counts[status]}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* PO Table */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-muted/20">
                <h2 className="text-lg font-bold">{t('poList.table.title')}</h2>
                <Badge variant="secondary" className="font-normal text-muted-foreground">
                  {t('poList.table.description', { total: filteredItems.length })}
                </Badge>
              </div>
              
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex flex-col justify-center items-center py-20">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                      <Package className="w-8 h-8 text-primary opacity-50" />
                    </motion.div>
                    <p className="mt-4 text-sm text-muted-foreground">Loading purchase orders...</p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <FileText className="w-12 h-12 text-muted-foreground opacity-20 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-1">No Purchase Orders</h3>
                    <p className="text-sm text-muted-foreground">{t('poList.table.empty')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold">{t('poList.table.poId')}</TableHead>
                          <TableHead className="font-semibold">{t('poList.table.product')}</TableHead>
                          <TableHead className="text-right font-semibold">{t('poList.table.qty')}</TableHead>
                          <TableHead className="text-right font-semibold">{t('poList.table.unitCost')}</TableHead>
                          <TableHead className="text-right font-semibold">{t('poList.table.total')}</TableHead>
                          <TableHead className="font-semibold">{t('poList.table.status')}</TableHead>
                          <TableHead className="font-semibold">{t('poList.table.date')}</TableHead>
                          <TableHead className="text-right font-semibold">{t('poList.table.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {filteredItems.map((po) => {
                            const cfg = STATUS_CONFIG[po.status];
                            const Icon = cfg.icon;
                            return (
                              <motion.tr
                                key={po.po_id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="group hover:bg-muted/30 transition-colors"
                              >
                                <TableCell className="font-mono text-sm font-medium">
                                  {po.po_id}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">{po.product_id}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">{po.quantity.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{formatCurrency(po.unit_cost)}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(po.total_cost)}</TableCell>
                                <TableCell>
                                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${cfg.bgColor} ${cfg.color} border-${cfg.color.split('-')[1]}-200/50`}>
                                    <Icon className="w-3.5 h-3.5" />
                                    {cfg.label}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {po.created_at ? new Date(po.created_at).toLocaleDateString() : '—'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end items-center gap-2">
                                    {po.status === 'created' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 border-blue-200 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                        disabled={updateMutation.isPending}
                                        onClick={() => updateMutation.mutate({ poId: po.po_id, action: 'approve' })}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1.5" />
                                        {t('poList.actions.approve')}
                                      </Button>
                                    )}
                                    {po.status === 'approved' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                        disabled={updateMutation.isPending}
                                        onClick={() => updateMutation.mutate({ poId: po.po_id, action: 'receive' })}
                                      >
                                        <Truck className="w-4 h-4 mr-1.5" />
                                        {t('poList.actions.receive')}
                                      </Button>
                                    )}
                                    {po.status === 'received' && (
                                      <span className="text-xs text-muted-foreground">Completed</span>
                                    )}
                                  </div>
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
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default PurchaseOrders;
