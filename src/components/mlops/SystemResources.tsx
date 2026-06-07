import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { SystemMetrics } from './types';

type Props = {
  data: SystemMetrics;
};

export const SystemResources = ({ data }: Props) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.7 }}
  >
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">System Resources</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Infrastructure utilization</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {[
            { label: 'CPU Usage', value: data.cpu },
            { label: 'Memory Usage', value: data.memory },
            { label: 'GPU Utilization', value: data.gpu },
          ].map((resource) => (
            <div key={resource.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">{resource.label}</span>
                <span className="text-xs sm:text-sm font-medium">{resource.value}%</span>
              </div>
              <Progress value={resource.value} className="h-1.5 sm:h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);
