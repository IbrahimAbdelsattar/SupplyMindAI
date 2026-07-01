import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Package, AlertTriangle, DollarSign, ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { AISummaryCard } from '@/components/ai/AISummaryCard';
import { apiFetch } from '@/lib/api';
import InventoryTable, { type InventoryItem } from '@/components/inventory/InventoryTable';
import StockChart, { type InventorySummary } from '@/components/inventory/StockChart';
import ChatBot from '@/components/inventory/ChatBot';
import { useCurrency } from '@/contexts/CurrencyContext';

type InventoryRecommendation = {
  product_id: string;
  product_name: string;
  currentStock: number;
  reorderPoint: number;
  reorderQty: number;
  safetyStock: number;
  leadTime: number;
  costSavings: number;
  riskLevel: 'low' | 'medium' | 'high';
};

interface RawInventoryItem {
  product_id: string;
  product_name: string;
  category: string;
  type: string;
  stock: number;
  date: string;
}

interface InventoryData {
  summary: InventorySummary;
  items: RawInventoryItem[];
}

function toInventoryItem(raw: RawInventoryItem): InventoryItem {
  const stock = raw.stock ?? 0;
  let stockStatus: string;
  if (stock <= 5) stockStatus = "Critical";
  else if (stock <= 20) stockStatus = "Low";
  else stockStatus = "Healthy";
  return {
    sku: raw.product_id,
    name: raw.product_name,
    category: raw.category ?? "",
    productType: raw.type ?? "",
    active: stock > 0,
    stock,
    averageDailyDemand: 0,
    coverageDays: null,
    coverageLabel: "",
    stockStatus,
    lastUpdated: raw.date ?? "",
    sourceText: "",
  };
}

const Inventory = () => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutateAsync: applyMutation, isPending: isApplying } = useMutation({
    mutationFn: async (payload: InventoryRecommendation) => {
      return apiFetch<InventoryRecommendation>('/inventory/update', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-optimize'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-list'] });
      toast({ title: t('inventory:toast.success'), description: t('inventory:toast.inventoryUpdated') });
    },
    onError: (error) => {
      toast({ title: t('inventory:toast.error'), description: (error as Error).message, variant: 'destructive' });
    },
  });

  const { data: inventoryRecommendations = [] } = useQuery({
    queryKey: ['inventory-optimize', 13],
    queryFn: () => apiFetch<InventoryRecommendation[]>('/inventory/optimize?limit=13'),
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-list'],
    queryFn: () => apiFetch<InventoryData>('/inventory'),
  });

  const items: InventoryItem[] = useMemo(
    () => (inventoryData?.items ?? []).map(toInventoryItem),
    [inventoryData?.items]
  );

  const totalSavings = useMemo(
    () => inventoryRecommendations.reduce((sum, item) => sum + item.costSavings, 0),
    [inventoryRecommendations]
  );

  const comparisonData = useMemo(
    () => inventoryRecommendations.map((item) => ({
      name: item.product_name.split(' ').slice(0, 2).join(' '),
      current: item.currentStock,
      optimal: item.reorderPoint + item.safetyStock,
    })),
    [inventoryRecommendations]
  );

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader 
          title={t('inventory:title')} 
          subtitle={t('inventory:subtitle')} 
        />

        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          <AISummaryCard
            title={t('inventory:aiSummaryTitle')}
            sourceType="inventory"
            question={t('inventory:aiSummaryQuestion')}
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-success/30 bg-success/5">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-success/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">{t('inventory:kpi.estCostSavings')}</p>
                      <p className="text-xl sm:text-2xl font-bold text-success">
                        {formatCurrency(totalSavings)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card>
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">{t('inventory:kpi.productsAnalyzed')}</p>
                      <p className="text-xl sm:text-2xl font-bold">{inventoryRecommendations.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card>
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">{t('inventory:kpi.highRiskItems')}</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {inventoryRecommendations.filter((i) => i.riskLevel === 'high').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Stock Overview — Full Width */}
          {inventoryData?.summary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <StockChart data={items} summary={inventoryData.summary} />
            </motion.div>
          )}

          {/* Inventory Table — Full Width */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="w-full"
          >
            <InventoryTable
              data={items}
              selectedSku={selectedItem?.sku ?? null}
              onSelectItem={setSelectedItem}
            />
          </motion.div>

          {/* AI Chat Assistant — Full Width below the table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="h-[420px]"
          >
            <ChatBot focusedItem={selectedItem} />
          </motion.div>

          {/* AI Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">{t('inventory:aiRecommendations.title')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{t('inventory:aiRecommendations.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {inventoryRecommendations.map((item, index) => (
                  <motion.div
                    key={item.product_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.05, 0.3) }}
                    className="p-3 sm:p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                  >
                    <div className="flex flex-col gap-3 sm:gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <h4 className="text-sm sm:text-lg font-semibold">{item.product_name}</h4>
                          <Badge
                            variant={
                              item.riskLevel === 'high'
                                ? 'destructive'
                                : item.riskLevel === 'medium'
                                ? 'secondary'
                                : 'outline'
                            }
                            className="text-xs"
                          >
                            {t('inventory:riskLevel.' + item.riskLevel)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-muted-foreground">{t('inventory:aiRecommendations.savings')}</p>
                            <p className="text-sm sm:text-lg font-bold text-success">
                              +{formatCurrency(item.costSavings)}
                            </p>
                          </div>
                          <Button size="sm" className="gap-1 h-8 text-xs sm:text-sm" onClick={() => applyMutation(item)} disabled={isApplying}>
                            {t('inventory:aiRecommendations.apply')}
                            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 sm:gap-4">
                        <div className="text-center">
                          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{t('inventory:aiRecommendations.stock')}</p>
                          <p className={cn(
                            "text-sm sm:text-xl font-bold",
                            item.currentStock < item.reorderPoint ? 'text-destructive' : ''
                          )}>
                            {item.currentStock}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{t('inventory:aiRecommendations.reorderPt')}</p>
                          <p className="text-sm sm:text-xl font-bold text-primary">{item.reorderPoint}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{t('inventory:aiRecommendations.reorderQty')}</p>
                          <p className="text-sm sm:text-xl font-bold text-accent">{item.reorderQty}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{t('inventory:aiRecommendations.safety')}</p>
                          <p className="text-sm sm:text-xl font-bold">{item.safetyStock}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:hidden text-xs text-muted-foreground">
                        <span>{t('inventory:aiRecommendations.leadTime', { days: item.leadTime })}</span>
                        <span className="font-bold text-success">+{formatCurrency(item.costSavings)}</span>
                      </div>

                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
                          <span className="text-muted-foreground">{t('inventory:aiRecommendations.stockLevel')}</span>
                          <span className="font-medium">
                            {Math.round((item.currentStock / (item.reorderPoint + item.safetyStock)) * 100)}%
                          </span>
                        </div>
                        <Progress 
                          value={(item.currentStock / (item.reorderPoint + item.safetyStock)) * 100}
                          className="h-1.5 sm:h-2"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Comparison Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">{t('inventory:comparisonChart.title')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{t('inventory:comparisonChart.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-60 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
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
                      <Bar dataKey="current" name={t('inventory:comparisonChart.currentStock')} fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="optimal" name={t('inventory:comparisonChart.optimalLevel')} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Inventory;
