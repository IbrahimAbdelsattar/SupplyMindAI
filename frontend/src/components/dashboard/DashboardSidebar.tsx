import { useTranslation } from "react-i18next";
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';
import { SupplyMindLogo } from '@/components/brand/SupplyMindLogo';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Brain,
  FileText,
  Settings,
  Activity,
  AlertTriangle,
  Shield,
  Sun,
  Moon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import React, { useState } from 'react';

type NavRole = 'admin' | 'manager' | 'analyst' | 'viewer';

const ROLE_HIERARCHY: Record<NavRole, number> = {
  admin: 4,
  manager: 3,
  analyst: 2,
  viewer: 1,
};

const navItems: { icon: React.ComponentType<{ className?: string }>; labelKey: string; path: string; minRole?: NavRole }[] = [
  { icon: LayoutDashboard, labelKey: 'common:nav.dashboard', path: '/dashboard' },
  { icon: TrendingUp, labelKey: 'common:nav.forecasting', path: '/forecasting', minRole: 'analyst' },
  { icon: Package, labelKey: 'common:nav.inventory', path: '/inventory' },
  { icon: Brain, labelKey: 'common:nav.aiInsights', path: '/insights' },
  { icon: FileText, labelKey: 'common:nav.reports', path: '/reports', minRole: 'manager' },
  { icon: AlertTriangle, labelKey: 'common:nav.alerts', path: '/alerts' },
  { icon: Activity, labelKey: 'common:nav.mlops', path: '/mlops', minRole: 'admin' },
  { icon: Shield, labelKey: 'common:nav.admin', path: '/admin/users', minRole: 'admin' },
  { icon: Settings, labelKey: 'common:nav.settings', path: '/settings' },
];

const SidebarContent = ({
  isCollapsed,
  setIsCollapsed,
  onNavigate,
}: {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  onNavigate?: () => void;
}) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { userRole } = useAuthContext();

  // Filter nav items by role
  const filteredNavItems = navItems.filter((item) => {
    if (!item.minRole) return true;
    const userLevel = ROLE_HIERARCHY[userRole as NavRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[item.minRole];
    return userLevel >= requiredLevel;
  });

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Logo Area */}
      <div className="h-[72px] flex items-center justify-between px-6 mb-4">
        <Link to="/dashboard" className="flex items-center gap-2" onClick={onNavigate}>
          <SupplyMindLogo iconOnly={isCollapsed} iconClassName="w-8 h-8" />
        </Link>
        {!isCollapsed ? (
          <motion.button
            onClick={() => setIsCollapsed(!isCollapsed)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="h-8 w-8 hidden lg:flex items-center justify-center text-muted-foreground hover:text-foreground transition-transform"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
        ) : (
          <motion.button
            onClick={() => setIsCollapsed(false)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="h-8 w-8 hidden lg:flex items-center justify-center text-muted-foreground hover:text-foreground transition-transform"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        )}
      </div>

      {/* Navigation — Neumorphic items */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto pb-4 scrollbar-none">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ease-out group',
                isActive
                  ? 'neu-panel-inset text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:neu-panel active:neu-button-active',
                isCollapsed && 'justify-center px-0'
              )}
            >
              <motion.div
                whileHover={{ scale: 1.15, rotate: 6 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
              </motion.div>
              {!isCollapsed && <span>{t(item.labelKey)}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer Area */}
      <div className="p-4 space-y-2 pb-6">
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium w-full text-muted-foreground hover:text-foreground hover:neu-panel active:neu-button-active',
            isCollapsed && 'justify-center px-0'
          )}
        >
          <motion.div
            whileHover={{ rotate: 90 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 flex-shrink-0 text-amber-500" />
            ) : (
              <Moon className="w-5 h-5 flex-shrink-0 text-indigo-500" />
            )}
          </motion.div>
          {!isCollapsed && <span>{theme === 'dark' ? t('common:theme.light') : t('common:theme.dark')}</span>}
        </motion.button>

        <LanguageSwitcher collapsed={isCollapsed} />
      </div>
    </div>
  );
};

export const DashboardSidebar = () => {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isMobile) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="fixed top-4 left-4 rtl:left-auto rtl:right-4 z-50 h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground neu-panel rounded-xl active:neu-button-active"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </motion.button>
        </SheetTrigger>
        <SheetContent side={i18n.dir() === "rtl" ? "right" : "left"} className="w-[280px] p-0 border-0 neu-panel">
          <SheetTitle className="sr-only">{t('common:nav.navigation')}</SheetTitle>
          <SidebarContent
            isCollapsed={false}
            setIsCollapsed={() => {}}
            onNavigate={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        'h-screen sticky top-0 flex flex-col transition-all duration-300 bg-background',
        // In Neumorphism, we remove the hard border and rely on shadows or background blending
        'border-r-0',
        isCollapsed ? 'w-[88px]' : 'w-[280px]'
      )}
    >
      <SidebarContent isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
    </motion.aside>
  );
};
