import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from '@/components/ui/animated-counter';

interface KPICardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'destructive';
  delay?: number;
}

const colorClasses = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

export const KPICard = ({
  title,
  value,
  prefix = '',
  suffix = '',
  change,
  changeLabel,
  icon: Icon,
  color = 'primary',
  delay = 0,
}: KPICardProps) => {
  const isPositive = change !== undefined && change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-card border border-border rounded-2xl p-3 sm:p-6 hover:border-primary/30 transition-colors group"
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className={cn('w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center', colorClasses[color])}>
          <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
        </div>
        {change !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-[10px] sm:text-sm font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg',
              isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
        <p className="text-xl sm:text-3xl font-bold">
          <AnimatedCounter
            value={value}
            prefix={prefix}
            suffix={suffix}
            duration={1.5}
          />
        </p>
        {changeLabel && (
          <p className="text-xs text-muted-foreground">{changeLabel}</p>
        )}
      </div>
    </motion.div>
  );
};
