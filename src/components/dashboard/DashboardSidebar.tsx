import { useTranslation } from "react-i18next";
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Brain,
  FileText,
  Settings,
  Activity,
  BarChart3,
  Sun,
  Moon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import React, { useState } from 'react';

const navItems: { icon: React.ComponentType<{ className?: string }>; labelKey: string; path: string }[] = [
  { icon: LayoutDashboard, labelKey: 'common:nav.dashboard', path: '/dashboard' },
  { icon: TrendingUp, labelKey: 'common:nav.forecasting', path: '/forecasting' },
  { icon: Package, labelKey: 'common:nav.inventory', path: '/inventory' },
  { icon: Brain, labelKey: 'common:nav.aiInsights', path: '/insights' },
  { icon: FileText, labelKey: 'common:nav.reports', path: '/reports' },
  { icon: Activity, labelKey: 'common:nav.mlops', path: '/mlops' },
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
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
          </div>
          {!isCollapsed && <span className="text-lg font-bold">{t('common:app.name')}</span>}
        </Link>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 hidden lg:flex"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(false)}
            className="h-8 w-8 hidden lg:flex"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>{t(item.labelKey)}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-border space-y-2">
        <Button
          variant="ghost"
          onClick={toggleTheme}
          className={cn(
            'w-full justify-start gap-3',
            isCollapsed && 'justify-center px-0'
          )}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 flex-shrink-0" />
          ) : (
            <Moon className="w-5 h-5 flex-shrink-0" />
          )}
          {!isCollapsed && <span>{theme === 'dark' ? t('common:theme.light') : t('common:theme.dark')}</span>}
        </Button>

        <LanguageSwitcher collapsed={isCollapsed} />

        {!isCollapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          onClick={logout}
          className={cn(
            'w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10',
            isCollapsed && 'justify-center px-0'
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>{t('common:auth.signOut')}</span>}
        </Button>
      </div>
    </div>
  );
};

export const DashboardSidebar = () => {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isMobile) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-3 left-3 rtl:left-auto rtl:right-3 z-50 h-10 w-10 rounded-xl bg-card border border-border shadow-md"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side={i18n.dir() === "rtl" ? "right" : "left"} className="w-72 p-0">
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
      transition={{ duration: 0.3 }}
      className={cn(
        'h-screen sticky top-0 border-r border-border bg-card flex flex-col transition-all duration-300',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <SidebarContent isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
    </motion.aside>
  );
};
