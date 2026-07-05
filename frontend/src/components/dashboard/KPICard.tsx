import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  index?: number;
}

const colorMap: Record<string, string> = {
  primary: '#2563EB',
  accent: '#10B981',
  success: '#10B981',
  warning: '#F97316',
  destructive: '#EF4444',
};

/** Format the number to estimate display length (including commas, prefix, suffix). */
function estimateDisplayLength(value: number, prefix: string, suffix: string): number {
  const formatted = value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return prefix.length + formatted.length + suffix.length;
}

/** Return adaptive font size class based on total character count. */
function getAdaptiveFontSize(charCount: number): string {
  if (charCount <= 7)  return 'text-2xl sm:text-3xl';      // e.g. "6,259"
  if (charCount <= 10) return 'text-xl sm:text-2xl';        // e.g. "$450,000"
  if (charCount <= 13) return 'text-lg sm:text-xl';         // e.g. "$27,638,083"
  if (charCount <= 16) return 'text-base sm:text-lg';       // e.g. "$1,234,567,890"
  return 'text-sm sm:text-base';                            // anything larger
}

export const KPICard = ({
  title,
  value,
  prefix = '',
  suffix = '',
  change,
  changeLabel,
  icon: Icon,
  color = 'primary',
  index = 0,
}: KPICardProps) => {
  const isPositive = change !== undefined && change >= 0;
  const changeColor = isPositive ? '#10B981' : '#EF4444';

  const adaptiveFontSize = useMemo(() => {
    const len = estimateDisplayLength(value, prefix, suffix);
    return getAdaptiveFontSize(len);
  }, [value, prefix, suffix]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15, delay: index * 0.03, ease: [0.23, 1, 0.32, 1] }}
          whileHover={{ 
            scale: 1.02, 
            y: -4,
            transition: { type: 'spring', stiffness: 300, damping: 22 }
          }}
          whileTap={{ scale: 0.98 }}
          className="rounded-3xl p-4 sm:p-5 flex flex-col justify-between h-full cursor-pointer relative overflow-hidden neu-card min-w-0"
        >
      {/* Decorative background glow based on the KPI color */}
      <motion.div 
        className="absolute -right-6 -top-6 w-28 h-28 rounded-full blur-[40px] opacity-10 pointer-events-none"
        style={{ backgroundColor: colorMap[color] }}
        whileHover={{ opacity: 0.25 }}
        transition={{ duration: 0.3 }}
      />

      <div className="flex items-start justify-between mb-3 sm:mb-4 relative z-10">
        <motion.div 
          className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl neu-basin flex items-center justify-center shrink-0"
          whileHover={{ scale: 1.12, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <motion.div
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm" style={{ color: colorMap[color] }} />
          </motion.div>
        </motion.div>
        
        {change !== undefined && (
          <motion.div
            className="flex items-center justify-center w-fit h-fit gap-1 text-[11px] sm:text-[12px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded-lg bg-transparent"
            style={{ color: changeColor }}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.08 }}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={3} />
            ) : (
              <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={3} />
            )}
            <span>{Math.abs(change)}%</span>
          </motion.div>
        )}
      </div>

      <div className="space-y-1 relative z-10 min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-muted-foreground tracking-tight truncate">{title}</p>
        <div className={cn(
          "font-extrabold text-foreground tracking-tight flex items-baseline min-w-0",
          adaptiveFontSize
        )}>
          <AnimatedCounter
            value={value}
            prefix={prefix}
            suffix={suffix}
            duration={1.5}
            className="block min-w-0 leading-tight"
          />
        </div>
        {changeLabel && (
          <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground/80 mt-0.5 truncate">{changeLabel}</p>
        )}
      </div>
    </motion.div>
    </PopoverTrigger>
    <PopoverContent 
      className="w-64 rounded-2xl p-4 origin-[var(--radix-popover-content-transform-origin)]"
      sideOffset={8}
    >
      <div className="space-y-2">
        <h4 className="font-medium leading-none flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          {title}
        </h4>
        <p className="text-sm text-muted-foreground">
          Detailed historical breakdown and related metrics will be visualized here in a future update.
        </p>
      </div>
    </PopoverContent>
  </Popover>
  );
};
