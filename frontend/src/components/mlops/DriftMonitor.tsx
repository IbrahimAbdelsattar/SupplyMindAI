import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { DriftMetric } from './types';

type Props = {
  data: DriftMetric[];
};

function statusIcon(status: string) {
  switch (status) {
    case 'healthy':
      return { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' };
    case 'warning':
      return { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' };
    case 'critical':
      return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' };
    default:
      return { icon: CheckCircle2, color: 'text-muted-foreground', bg: 'bg-muted/10' };
  }
}

function badgeVariant(status: string) {
  switch (status) {
    case 'healthy':
      return 'outline' as const;
    case 'warning':
      return 'secondary' as const;
    case 'critical':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

function pValueLabel(p: number): string {
  if (p < 0.001) return 'Highly significant';
  if (p < 0.01) return 'Very significant';
  if (p < 0.05) return 'Significant';
  return 'Not significant';
}

export const DriftMonitor = ({ data }: Props) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.5 }}
  >
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">Data Drift Monitoring</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Feature distribution stability (KS-test, threshold p &lt; 0.05)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No drift data available.
          </p>
        )}
        {data.map((item, index) => {
          const { icon: Icon, color, bg } = statusIcon(item.status);
          return (
            <motion.div
              key={item.feature}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
              className="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-border"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div
                  className={cn(
                    'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    bg
                  )}
                >
                  <Icon className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4', color)} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm sm:text-base truncate">{item.feature}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    KS={item.drift.toFixed(4)} &middot; p={item.p_value.toFixed(6)} &middot; {pValueLabel(item.p_value)}
                  </p>
                </div>
              </div>
              <Badge
                variant={badgeVariant(item.status)}
                className={cn(
                  'text-xs flex-shrink-0',
                  item.status === 'healthy'
                    ? 'border-success/50 text-success'
                    : item.status === 'warning'
                    ? 'border-warning/50 text-warning'
                    : 'border-destructive/50 text-destructive'
                )}
              >
                {item.status}
              </Badge>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  </motion.div>
);
