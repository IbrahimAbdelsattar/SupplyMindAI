import { motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@clerk/clerk-react';

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

  const { getToken } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const waitForToken = async (timeoutMs: number) => {
      const start = Date.now();
      while (!cancelled && Date.now() - start < timeoutMs) {
        const token = await getToken();
        if (token) return token;
        await new Promise((r) => setTimeout(r, 250));
      }
      return null;
    };

    const loadAlerts = async () => {
      try {
        const token = await waitForToken(2000);
        if (!token) return;

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
  }, [getToken]);

  const visibleAlerts = (Array.isArray(apiAlerts) ? apiAlerts : []).filter(
    (alert) => !dismissedAlerts.includes(alert.id)
  );

  const dismissAlert = (id: number) => {
    setDismissedAlerts((prev) => [...prev, id]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="bg-card border border-border rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Active Alerts</h3>
          <p className="text-sm text-muted-foreground">{visibleAlerts.length} alerts requiring attention</p>
        </div>
        <Button variant="outline" size="sm">
          View All
        </Button>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 rtl:pl-2 rtl:pr-0">
        {visibleAlerts.map((alert, index) => {
          const Icon = alertIcons[alert.type];
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={cn(
                'flex items-start gap-3 p-4 rounded-xl border',
                alertStyles[alert.type]
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 mt-0.5',
                  iconStyles[alert.type]
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-medium">{alert.title}</h4>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{alert.time}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground">
                  {alert.product}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => dismissAlert(alert.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          );
        })}

        {visibleAlerts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-success" />
            <p>All alerts have been addressed!</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
