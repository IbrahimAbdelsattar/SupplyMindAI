import { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, Calendar } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { fetchApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  time: string;
}

export const DashboardHeader = ({ title, subtitle }: DashboardHeaderProps) => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState(t('common:dateRange.last7days'));
  const [notifications, setNotifications] = useState<Alert[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchApi('/alerts/active', { auth: true }) as any;
        const rawAlerts = Array.isArray(data?.alerts) ? data.alerts : [];
        const mappedAlerts: Alert[] = rawAlerts.map((item: any) => ({
          id: item.id,
          type: item.severity === 'critical' ? 'error' : (item.severity === 'high' ? 'warning' : 'info'),
          title: item.title,
          message: item.description,
          time: item.created_at 
            ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : 'Just now'
        }));
        setNotifications(mappedAlerts);
      } catch {
        // keep silent to avoid killing the dashboard header
      }
    };
    void load();
  }, []);

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="h-auto min-h-[72px] sm:h-[88px] sticky top-0 z-40 flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 sm:px-8 py-4 sm:py-0 gap-4 sm:gap-0 pl-16 sm:pl-8 rtl:pr-16 rtl:sm:pr-8 rtl:pl-6 rtl:sm:pl-8 bg-background border-b-0"
    >
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm sm:text-base text-muted-foreground mt-1 font-medium">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
        {/* Search - Neumorphic Inset */}
        <div className="relative hidden md:block group">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2"
          >
            <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
          </motion.div>
          <input
            type="text"
            placeholder={t('common:search.placeholder')}
            className="pl-11 rtl:pl-4 rtl:pr-11 w-[280px] h-11 rounded-2xl border-none neu-panel-inset text-[15px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-200"
          />
        </div>

        {/* Date Range - Neumorphic Pill */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground h-11 px-4 rounded-2xl neu-panel active:neu-button-active outline-none"
            >
              <motion.div
                whileHover={{ rotate: -15 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                <Calendar className="w-4 h-4 text-primary" />
              </motion.div>
              <span className="hidden xs:inline">{dateRange}</span>
              <span className="xs:hidden">{t('common:dateRange.abbreviated')}</span>
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="neu-panel border-none rounded-2xl p-2 w-[200px]">
            <DropdownMenuItem onClick={() => setDateRange(t('common:dateRange.today'))} className="rounded-xl font-medium focus:bg-background focus:text-primary cursor-pointer p-3">{t('common:dateRange.today')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDateRange(t('common:dateRange.last7days'))} className="rounded-xl font-medium focus:bg-background focus:text-primary cursor-pointer p-3">{t('common:dateRange.last7days')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDateRange(t('common:dateRange.last30days'))} className="rounded-xl font-medium focus:bg-background focus:text-primary cursor-pointer p-3">{t('common:dateRange.last30days')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDateRange(t('common:dateRange.last90days'))} className="rounded-xl font-medium focus:bg-background focus:text-primary cursor-pointer p-3">{t('common:dateRange.last90days')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center relative h-11 w-11 text-muted-foreground hover:text-foreground rounded-2xl neu-panel active:neu-button-active outline-none"
            >
              <motion.div
                whileHover={{ rotate: [0, -12, 12, -6, 0] }}
                transition={{ duration: 0.5 }}
              >
                <Bell className="w-5 h-5" />
              </motion.div>
              <AnimatePresence>
                {notifications.length > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 rtl:-right-auto rtl:-left-1 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center bg-destructive text-destructive-foreground shadow-sm shadow-destructive/40"
                  >
                    {notifications.length}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[320px] sm:w-[360px] neu-panel border-none rounded-2xl p-2 mt-2">
            <DropdownMenuLabel className="text-foreground font-bold px-4 py-3 text-base">{t('common:notifications.title')}</DropdownMenuLabel>
            <div className="h-px w-full bg-border opacity-50 my-1" />
            <div className="space-y-1">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm font-medium text-muted-foreground">
                  No new notifications
                </div>
              ) : (
                notifications.slice(0, 4).map((alert) => (
                  <DropdownMenuItem key={alert.id} className="flex flex-col items-start gap-1.5 p-3.5 rounded-xl cursor-pointer focus:bg-background/80 transition-colors">
                    <div className="flex items-center gap-2 w-full justify-between">
                      <span
                        className={cn(
                          "text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md neu-panel-inset",
                          alert.type === 'error' ? 'text-destructive' : 'text-muted-foreground'
                        )}
                      >
                        {alert.type}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">{alert.time}</span>
                    </div>
                    <span className="text-[15px] font-semibold text-foreground leading-tight mt-1">{alert.title}</span>
                    <span className="text-sm font-medium text-muted-foreground leading-snug line-clamp-2">{alert.message}</span>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
};
