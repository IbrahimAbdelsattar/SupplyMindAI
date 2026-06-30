import { motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import { useEffect, useState } from 'react';

const alertIcons = {
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
  success: CheckCircle2,
};

const alertStyles = {
  warning: 'border-warning/30 bg-warning/5',
  error: 'border-destructive/30 bg-destructive/5',
  info: 'border-primary/30 bg-primary/5',
  success: 'border-success/30 bg-success/5',
};

const iconStyles = {
  warning: 'text-warning',
  error: 'text-destructive',
  info: 'text-primary',
  success: 'text-success',
};

type AlertType = keyof typeof alertIcons;

type AlertItem = {
  id: number;
  type: AlertType;
  title: string;
  message: string;
  product: string;
  time: string;
};

export const AlertsPanel = () => {
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);
  const [apiAlerts, setApiAlerts] = useState<AlertItem[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAlerts = async () => {
      try {
        const data = await fetchApi('/alerts/active') as unknown;
        const alerts = Array.isArray(data)
          ? (data as AlertItem[])
          : ((data as any)?.alerts ??
              (data as any)?.items ??
              (data as any)?.results ??
              []);
        if (!cancelled) setApiAlerts(alerts);
      } catch (err) {
        console.error(err);
      }
    };

    void loadAlerts();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleAlerts = (Array.isArray(apiAlerts) ? apiAlerts : []).filter(
    (alert) => !dismissedAlerts.includes(alert.id)
  );

  const dismissAlert = (id: number) => {
    setDismissedAlerts((prev) => [...prev, id]);
  };

  return (
    <div className="neu-panel rounded-3xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-foreground tracking-tight">Active Alerts</h3>
          <p className="text-[15px] font-medium text-muted-foreground mt-1">{visibleAlerts.length} alerts requiring attention</p>
        </div>
        <button className="h-9 px-4 rounded-xl neu-panel active:neu-button-active text-sm font-bold text-muted-foreground hover:text-foreground transition-all duration-200">
          View All
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-2 rtl:pl-2 rtl:pr-0 scrollbar-none pb-2">
        {visibleAlerts.map((alert, index) => {
          const Icon = alertIcons[alert.type];
          return (
            <motion.div
              layout
              key={alert.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              whileHover={{ scale: 1.01, y: -2 }}
              transition={{ duration: 0.4, delay: index * 0.1, ease: [0.23, 1, 0.32, 1] }}
              className={cn(
                'flex items-start gap-4 p-5 rounded-2xl neu-panel-inset relative overflow-hidden group cursor-default',
              )}
              onMouseEnter={() => setHoverIndex(alert.id)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <div 
                className="absolute left-0 top-0 bottom-0 w-1.5 opacity-80"
                style={{ backgroundColor: `var(--${alert.type === 'error' ? 'destructive' : alert.type === 'warning' ? 'warning' : 'primary'})` }}
              />
              <motion.div 
                className="w-10 h-10 rounded-xl neu-panel flex items-center justify-center flex-shrink-0 mt-0.5"
                whileHover={{ scale: 1.15, rotate: 8 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 drop-shadow-sm',
                    iconStyles[alert.type]
                  )}
                />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-[15px] font-bold text-foreground tracking-tight">{alert.title}</h4>
                  <span className="text-xs font-semibold text-muted-foreground flex-shrink-0 bg-background/50 px-2 py-1 rounded-lg">{alert.time}</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">{alert.message}</p>
                <span className="inline-block mt-3 px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase rounded-md bg-background text-foreground shadow-sm">
                  {alert.product}
                </span>
              </div>
              <motion.button
                className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                onClick={() => dismissAlert(alert.id)}
                whileHover={{ scale: 1.2, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </motion.div>
          );
        })}

        {visibleAlerts.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 text-muted-foreground neu-panel-inset rounded-2xl mx-1"
          >
            <motion.div 
              className="w-16 h-16 rounded-full neu-panel flex items-center justify-center mx-auto mb-4 text-success"
              whileHover={{ scale: 1.1, rotate: 10 }}
            >
              <CheckCircle2 className="w-8 h-8" />
            </motion.div>
            <p className="text-[15px] font-bold">All alerts have been addressed!</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
