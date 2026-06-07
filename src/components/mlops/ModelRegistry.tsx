import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { RefreshCw, Brain, Clock, BarChart3 } from 'lucide-react';
import type { MLOpsMetrics } from './types';

type Props = {
  data: MLOpsMetrics;
  onRetrain?: () => void;
  retraining?: boolean;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function accuracyColor(acc: number): string {
  if (acc >= 90) return 'text-success';
  if (acc >= 80) return 'text-warning';
  return 'text-destructive';
}

export const ModelRegistry = ({ data, onRetrain, retraining }: Props) => {
  const latestAccuracy = data.modelAccuracy[data.modelAccuracy.length - 1];
  const latestRetrain = data.retrainingHistory[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
    >
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg">Model Registry</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Active model versions and health
              </CardDescription>
            </div>
            <Button
              onClick={onRetrain}
              disabled={retraining}
              variant="outline"
              size="sm"
              className="gap-2 w-full sm:w-auto"
            >
              <RefreshCw className={cn('w-4 h-4', retraining && 'animate-spin')} />
              {retraining ? 'Retraining…' : 'Trigger Retraining'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm">Model</TableHead>
                <TableHead className="text-xs sm:text-sm">Version</TableHead>
                <TableHead className="text-xs sm:text-sm text-right">Accuracy</TableHead>
                <TableHead className="text-xs sm:text-sm text-right">Status</TableHead>
                <TableHead className="text-xs sm:text-sm text-right">Last Trained</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="text-xs sm:text-sm">Demand Forecast Pipeline</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {latestRetrain ? formatDate(latestRetrain.date) : '—'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className={cn('text-xs sm:text-sm font-medium', accuracyColor(latestAccuracy?.accuracy ?? 0))}>
                      {latestAccuracy ? `${latestAccuracy.accuracy.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      latestAccuracy && latestAccuracy.accuracy >= 90
                        ? 'border-success/50 text-success'
                        : latestAccuracy && latestAccuracy.accuracy >= 80
                        ? 'border-warning/50 text-warning'
                        : 'border-destructive/50 text-destructive'
                    )}
                  >
                    {latestAccuracy && latestAccuracy.accuracy >= 90
                      ? 'Production'
                      : latestAccuracy && latestAccuracy.accuracy >= 80
                      ? 'Degraded'
                      : 'Critical'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-xs sm:text-sm text-muted-foreground">
                  {latestRetrain ? formatDate(latestRetrain.date) : '—'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
};
