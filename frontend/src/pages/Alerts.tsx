import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AIChatbot } from '@/components/chatbot/AIChatbot';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package, RefreshCw, ShieldCheck } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';

type AlertItem = {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  product_id: string;
  created_at: string;
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  low: 'bg-primary/10 text-primary border-primary/20',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  stockout: <AlertTriangle className="w-4 h-4" />,
  low_stock: <Package className="w-4 h-4" />,
  critical_stock: <AlertTriangle className="w-4 h-4" />,
};

const easeOutExpo = [0.23, 1, 0.32, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.15, ease: easeOutExpo },
  },
};

const Alerts = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => fetchApi('/system/alerts/active') as Promise<{ alerts: AlertItem[]; total: number }>,
    refetchInterval: 30000,
  });

  const alerts = data?.alerts ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300 overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto scrollbar-none relative">
        <DashboardHeader title={t('alerts:title')} subtitle={t('alerts:subtitle')} />
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex-1 p-4 md:p-6 space-y-6"
        >
          {/* Summary Bar */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="neu-panel-inset rounded-2xl px-4 py-2 flex items-center gap-2">
                {total > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                )}
                <span className="text-sm font-semibold">
                  {total > 0 ? t('alerts:total', { count: total }) : t('alerts:noAlerts')}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['alerts'] })}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t('alerts:refresh')}
            </Button>
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <motion.div variants={itemVariants} className="flex items-center justify-center py-20">
              <div className="text-muted-foreground text-sm">{t('alerts:loading')}</div>
            </motion.div>
          )}

          {/* Error State */}
          {error && (
            <motion.div variants={itemVariants}>
              <Card className="neu-card border-destructive/20">
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-destructive">{t('alerts:error')}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Empty State */}
          {!isLoading && !error && alerts.length === 0 && (
            <motion.div variants={itemVariants}>
              <Card className="neu-card">
                <CardContent className="p-12 text-center">
                  <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <CardTitle className="text-lg mb-2">{t('alerts:empty')}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t('alerts:emptyDesc')}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Alert List */}
          {!isLoading && alerts.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              {alerts.map((alert) => (
                <Card key={alert.id} className="neu-card hover:neu-lift transition-all duration-200">
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 flex-shrink-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.medium}`}>
                          {TYPE_ICONS[alert.type] ?? <Package className="w-4 h-4" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-semibold truncate">{alert.title}</h3>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${SEVERITY_STYLES[alert.severity] ?? ''}`}
                          >
                            {t(`alerts:severity.${alert.severity}`)}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {t(`alerts:type.${alert.type}`)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {alert.description}
                        </p>
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>Product: {alert.product_id}</span>
                          <span>{new Date(alert.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}
        </motion.div>
        <AIChatbot />
      </div>
    </div>
  );
};

export default Alerts;
