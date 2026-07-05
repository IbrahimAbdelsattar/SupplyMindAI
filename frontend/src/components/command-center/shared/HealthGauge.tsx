import { motion } from 'framer-motion';

interface HealthGaugeProps {
  value: number;
  max?: number;
  size?: number;
  label: string;
  status?: 'healthy' | 'warning' | 'critical' | 'neutral';
}

const statusColors = {
  healthy: 'var(--health-healthy)',
  warning: 'var(--health-warning)',
  critical: 'var(--health-critical)',
  neutral: 'var(--health-neutral)',
};

export function HealthGauge({
  value,
  max = 100,
  size = 120,
  label,
  status = 'healthy',
}: HealthGaugeProps) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const dashOffset = circumference * (1 - progress);
  const color = statusColors[status];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label}: ${Math.round(value)} of ${max}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={8}
            className="text-white/10 dark:text-white/5"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-bold"
            style={{ color }}
          >
            {Math.round(value)}
            <span className="text-sm font-normal opacity-60">%</span>
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-center text-slate-500 dark:text-slate-400 max-w-[100px] leading-tight">
        {label}
      </span>
    </div>
  );
}
