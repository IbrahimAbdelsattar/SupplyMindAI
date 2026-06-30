import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
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
  index?: number;
}

const colorMap: Record<string, string> = {
  primary: '#2563EB',
  accent: '#10B981',
  success: '#10B981',
  warning: '#F97316',
  destructive: '#EF4444',
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
  index = 0,
}: KPICardProps) => {
  const isPositive = change !== undefined && change >= 0;
  const changeColor = isPositive ? '#10B981' : '#EF4444';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ 
        scale: 1.02, 
        y: -4,
        transition: { type: 'spring', stiffness: 300, damping: 22 }
      }}
      whileTap={{ scale: 0.98 }}
      className="rounded-3xl p-5 sm:p-7 flex flex-col justify-between h-full cursor-default relative overflow-hidden neu-card"
    >
      {/* Decorative background glow based on the KPI color */}
      <motion.div 
        className="absolute -right-6 -top-6 w-32 h-32 rounded-full blur-[40px] opacity-10 pointer-events-none"
        style={{ backgroundColor: colorMap[color] }}
        whileHover={{ opacity: 0.25 }}
        transition={{ duration: 0.3 }}
      />

      <div className="flex items-start justify-between mb-4 sm:mb-6 relative z-10">
        <motion.div 
          className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl neu-basin flex items-center justify-center"
          whileHover={{ scale: 1.12, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <motion.div
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Icon className="w-5 h-5 sm:w-7 sm:h-7 drop-shadow-sm" style={{ color: colorMap[color] }} />
          </motion.div>
        </motion.div>
        
        {change !== undefined && (
          <motion.div
            className="flex items-center justify-center w-fit h-fit gap-1 text-[12px] sm:text-[13px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded-lg bg-transparent"
            style={{ color: changeColor }}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.08 }}
          >
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} />
            )}
            <span>{Math.abs(change)}%</span>
          </motion.div>
        )}
      </div>

      <div className="space-y-1.5 relative z-10">
        <p className="text-sm font-semibold text-muted-foreground tracking-tight">{title}</p>
        <div className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight flex items-baseline">
          <AnimatedCounter
            value={value}
            prefix={prefix}
            suffix={suffix}
            duration={1.5}
          />
        </div>
        {changeLabel && (
          <p className="text-[13px] font-medium text-muted-foreground/80 mt-1">{changeLabel}</p>
        )}
      </div>
    </motion.div>
  );
};
