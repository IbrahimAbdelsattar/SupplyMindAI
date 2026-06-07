import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Activity, RefreshCw, AlertTriangle, Zap, CheckCircle2, XCircle } from 'lucide-react';
import type { MLOpsMetrics } from './types';

type Props = {
  data: MLOpsMetrics;
};

function daysAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}

function modelHealth(data: MLOpsMetrics): { label: string; color: string } {
  const latest = data.modelAccuracy[data.modelAccuracy.length - 1];
  if (!latest) return { label: 'Unknown', color: 'muted' };
  if (latest.accuracy >= 90) return { label: 'Healthy', color: 'success' };
  if (latest.accuracy >= 80) return { label: 'Degraded', color: 'warning' };
  return { label: 'Critical', color: 'destructive' };
}

function pipelineHealth(data: MLOpsMetrics): { label: string; color: string; icon: typeof CheckCircle2 } {
  const critical = data.dataDrift.filter((d) => d.status === 'critical').length;
  const warnings = data.dataDrift.filter((d) => d.status === 'warning').length;
  if (critical > 0) return { label: `${critical} critical`, color: 'destructive', icon: XCircle };
  if (warnings > 0) return { label: `${warnings} warnings`, color: 'warning', icon: AlertTriangle };
  return { label: 'Active', color: 'success', icon: CheckCircle2 };
}

function avgLatency(data: MLOpsMetrics): string {
  const mem = data.system.memory;
  const cpu = data.system.cpu;
  if (mem > 80 || cpu > 80) return 'High';
  if (mem > 50 || cpu > 50) return 'Moderate';
  return 'Fast';
}

export const StatusCards = ({ data }: Props) => {
  const health = modelHealth(data);
  const lastRetrain = data.retrainingHistory[0]?.date
    ? daysAgo(data.retrainingHistory[0].date)
    : 'N/A';
  const pipe = pipelineHealth(data);
  const latency = avgLatency(data);

  const cards = [
    {
      label: 'Model Status',
      value: health.label,
      icon: Activity,
      color: health.color,
    },
    {
      label: 'Last Retrain',
      value: lastRetrain,
      icon: RefreshCw,
      color: 'primary',
    },
    {
      label: 'Data Pipeline',
      value: pipe.label,
      icon: pipe.icon,
      color: pipe.color,
    },
    {
      label: 'Inference',
      value: latency,
      icon: Zap,
      color: latency === 'Fast' ? 'success' : latency === 'Moderate' ? 'warning' : 'destructive',
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
      {cards.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
        >
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className={cn(
                    'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                    `bg-${item.color}/10`
                  )}
                >
                  <item.icon className={cn('w-5 h-5 sm:w-6 sm:h-6', `text-${item.color}`)} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{item.label}</p>
                  <p className="text-base sm:text-xl font-bold truncate">{item.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
