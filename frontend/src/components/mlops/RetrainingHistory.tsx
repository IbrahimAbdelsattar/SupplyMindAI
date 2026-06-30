import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import type { RetrainingEvent } from './types';

type Props = {
  data: RetrainingEvent[];
};

export const RetrainingHistory = ({ data }: Props) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.6 }}
  >
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">Retraining History</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Recent model updates and triggers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No retraining history available.
          </p>
        )}
        {data.map((item, index) => (
          <motion.div
            key={item.date + item.trigger}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
            className="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-border"
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm sm:text-base truncate">{item.date}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Trigger: {item.trigger}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <Badge variant="outline" className={cn(
                'text-xs mb-0.5',
                item.status === 'Success' ? 'border-success/50 text-success' : 'border-destructive/50 text-destructive'
              )}>
                {item.status}
              </Badge>
              <p className="text-[10px] sm:text-xs text-success font-medium">{item.improvement}</p>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  </motion.div>
);
