import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, LogOut, Bell, Check, CheckCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuthContext } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  analyst: 'Analyst',
  viewer: 'Viewer',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  manager: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  analyst: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  viewer: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-blue-500',
  info: 'bg-muted-foreground/40',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const DashboardHeader = ({ title, subtitle }: DashboardHeaderProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userRole, user, logout } = useAuthContext();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const roleLabel = ROLE_LABELS[userRole || 'analyst'] || 'Analyst';
  const roleColorClass = ROLE_COLORS[userRole || 'analyst'] || ROLE_COLORS.analyst;

  const recentNotifications = notifications.slice(0, 10);

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
        {/* Notification Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 rounded-xl hover:bg-muted transition-colors outline-none">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[360px] rounded-2xl p-0 overflow-hidden border-none shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-bold text-foreground">
                {t('notifications.title', 'Notifications')}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  {t('notifications.markAllRead', 'Mark all read')}
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {recentNotifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {t('notifications.empty', 'No notifications')}
                </div>
              ) : (
                recentNotifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 rounded-none cursor-pointer border-b border-border/50 last:border-0 ${
                      !n.read ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => !n.read && markRead(n.id)}
                  >
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${SEVERITY_COLORS[n.severity] || 'bg-muted-foreground/40'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold truncate ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                      <span className="text-[10px] text-muted-foreground/70 mt-1 block">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile & Sign Out */}
        <div className="flex items-center ml-2 border-l border-border pl-4 gap-3">
          {/* Role Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${roleColorClass}`}>
            <Shield className="w-3 h-3" />
            {roleLabel}
          </div>
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 outline-none">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="neu-panel border-none rounded-2xl p-2 w-[220px]">
              {user && (
                <div className="px-3 py-2 mb-1">
                  <p className="text-sm font-bold text-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              )}
              <DropdownMenuSeparator className="bg-border my-1" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="rounded-xl font-medium focus:bg-red-500/10 focus:text-red-600 cursor-pointer p-3 text-red-500"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  );
};
