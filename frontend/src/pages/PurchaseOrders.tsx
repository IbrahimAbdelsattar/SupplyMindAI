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
import { CheckCircle, Clock, Package, Truck, FileText, ChevronRight, BarChart3 } from 'lucide-react';
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

const STATUS_CONFIG: Record<POStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; badgeColor: string }> = {
  created: { label: 'Created', icon: Clock, color: 'text-amber-500', badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/50' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'text-blue-500', badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900/50' },
  received: { label: 'Received', icon: Truck, color: 'text-emerald-500', badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' },
};

// Emil Design Spring Config
const SPRING_LIVELY = { type: 'spring', duration: 0.6, bounce: 0.3 };
const SPRING_NORMAL = { type: 'spring', duration: 0.5, bounce: 0.2 };

const PurchaseOrders = () => {
  const { t } = useTranslation();
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

  // Summary counts across ALL items, not just filtered
  const counts = { created: 0, approved: 0, received: 0 };
  allItems.forEach((po) => { counts[po.status]++; });

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--neu-bg)]">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader title="" />
        
        <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
          
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING_NORMAL}
            className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" />
                Supply Chain
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                {t('poList.title')}
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl text-lg">
                {t('poList.subtitle')}
              </p>
            </div>
            
            <div className="neu-basin rounded-2xl p-2 w-full md:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px] border-none bg-transparent shadow-none focus:ring-0 font-medium">
                  <SelectValue placeholder={t('poList.filter.all')} />
                </SelectTrigger>
                <SelectContent className="neu-card border-none rounded-xl">
                  <SelectItem value="all" className="cursor-pointer py-2">{t('poList.filter.all')}</SelectItem>
                  <SelectItem value="created" className="cursor-pointer py-2">{t('poList.filter.created')}</SelectItem>
                  <SelectItem value="approved" className="cursor-pointer py-2">{t('poList.filter.approved')}</SelectItem>
                  <SelectItem value="received" className="cursor-pointer py-2">{t('poList.filter.received')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {(['created', 'approved', 'received'] as const).map((status, idx) => {
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={status}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING_NORMAL, delay: idx * 0.1 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className="neu-card border-none overflow-hidden relative group">
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br from-transparent to-${cfg.color.split('-')[1]}-500`} />
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-3">
                          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            {cfg.label}
                          </p>
                          <p className="text-4xl font-extrabold text-foreground">
                            {counts[status]}
                          </p>
                        </div>
                        <div className={`p-3 rounded-2xl ${cfg.badgeColor}`}>
                          <Icon className={`w-7 h-7 ${cfg.color}`} />
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_NORMAL, delay: 0.3 }}
          >
            <Card className="neu-card border-none overflow-hidden">
              <div className="p-6 border-b border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{t('poList.table.title')}</h2>
                    <p className="text-sm text-muted-foreground">{t('poList.table.description', { total: filteredItems.length })}</p>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex flex-col justify-center items-center py-20">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                      <Package className="w-12 h-12 text-primary opacity-50" />
                    </motion.div>
                    <p className="mt-4 font-medium text-muted-foreground">Loading records...</p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-24 px-4">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full neu-basin flex items-center justify-center">
                      <FileText className="w-8 h-8 text-muted-foreground opacity-50" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No Purchase Orders Found</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">{t('poList.table.empty')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow className="border-border/40 hover:bg-transparent">
                          <TableHead className="font-semibold text-muted-foreground h-12">{t('poList.table.poId')}</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">{t('poList.table.product')}</TableHead>
                          <TableHead className="text-right font-semibold text-muted-foreground">{t('poList.table.qty')}</TableHead>
                          <TableHead className="text-right font-semibold text-muted-foreground">{t('poList.table.unitCost')}</TableHead>
                          <TableHead className="text-right font-semibold text-muted-foreground">{t('poList.table.total')}</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">{t('poList.table.status')}</TableHead>
                          <TableHead className="font-semibold text-muted-foreground">{t('poList.table.date')}</TableHead>
                          <TableHead className="text-right font-semibold text-muted-foreground">{t('poList.table.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {filteredItems.map((po, idx) => {
                            const cfg = STATUS_CONFIG[po.status];
                            const Icon = cfg.icon;
                            return (
                              <motion.tr
                                key={po.po_id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ ...SPRING_LIVELY, delay: idx * 0.05 }}
                                whileHover={{ backgroundColor: 'var(--neu-bg)', scale: 1.005, originX: 0 }}
                                className="group border-border/40 transition-colors"
                              >
                                <TableCell className="font-mono text-sm font-bold text-foreground/80 py-4">
                                  {po.po_id}
                                </TableCell>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg neu-basin flex items-center justify-center bg-muted/30">
                                      <Package className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    {po.product_id}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium">{po.quantity.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{formatCurrency(po.unit_cost)}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(po.total_cost)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`${cfg.badgeColor} border gap-1.5 px-2.5 py-1 rounded-full shadow-sm`}>
                                    <Icon className="w-3.5 h-3.5" />
                                    <span className="font-semibold tracking-wide uppercase text-[10px]">{cfg.label}</span>
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                  {po.created_at ? new Date(po.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {po.status === 'created' && (
                                      <Button
                                        size="sm"
                                        className="neu-btn bg-blue-500 hover:bg-blue-600 text-white rounded-xl active:scale-[0.97]"
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
                                        className="neu-btn bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl active:scale-[0.97]"
                                        disabled={updateMutation.isPending}
                                        onClick={() => updateMutation.mutate({ poId: po.po_id, action: 'receive' })}
                                      >
                                        <Truck className="w-4 h-4 mr-1.5" />
                                        {t('poList.actions.receive')}
                                      </Button>
                                    )}
                                    {po.status === 'received' && (
                                      <span className="text-xs font-medium text-emerald-500 flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Completed
                                      </span>
                                    )}
                                    <Button size="icon" variant="ghost" className="rounded-full w-8 h-8 hover:bg-background">
                                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </Button>
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
