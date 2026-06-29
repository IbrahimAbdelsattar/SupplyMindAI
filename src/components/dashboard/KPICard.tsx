import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'destructive';
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
}: KPICardProps) => {
  const isPositive = change !== undefined && change >= 0;
  const changeColor = isPositive ? '#10B981' : '#EF4444';

  return (
    <div className="neu-panel rounded-3xl p-5 sm:p-7 flex flex-col justify-between h-full group hover:scale-[1.02] transition-transform duration-300 ease-out cursor-default relative overflow-hidden">
      {/* Decorative background glow based on the KPI color */}
      <div 
        className="absolute -right-6 -top-6 w-32 h-32 rounded-full blur-[40px] opacity-10 transition-opacity duration-300 group-hover:opacity-20 pointer-events-none"
        style={{ backgroundColor: colorMap[color] }}
      />

      <div className="flex items-start justify-between mb-4 sm:mb-6 relative z-10">
        <div 
          className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl neu-panel-inset flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
        >
          <Icon className="w-5 h-5 sm:w-7 sm:h-7 drop-shadow-sm" style={{ color: colorMap[color] }} />
        </div>
        
        {change !== undefined && (
          <div
            className="flex items-center gap-1.5 text-[11px] sm:text-sm font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl neu-panel-inset drop-shadow-sm"
            style={{ color: changeColor }}
          >
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" strokeWidth={3} />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" strokeWidth={3} />
            )}
            {Math.abs(change)}%
          </div>
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
    </div>
  );
};
