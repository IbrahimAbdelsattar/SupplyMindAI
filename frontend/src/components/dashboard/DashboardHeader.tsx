import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Shield, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { UserButton, useUser, useClerk } from '@clerk/clerk-react';

import { useAuthContext } from '@/contexts/AuthContext';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  analista: 'Analyst',
  vendedor: 'Sales',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  manager: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  analista: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  vendedor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
};

export const DashboardHeader = ({ title, subtitle }: DashboardHeaderProps) => {
  const { t } = useTranslation();
  const { userRole } = useAuthContext();
  const { signOut } = useClerk();
  const { user } = useUser();

  const roleLabel = ROLE_LABELS[userRole || 'analista'] || 'Analyst';
  const roleColorClass = ROLE_COLORS[userRole || 'analista'] || ROLE_COLORS.analista;

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
                <UserButton afterSignOutUrl="/login" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="neu-panel border-none rounded-2xl p-2 w-[220px]">
              {user && (
                <div className="px-3 py-2 mb-1">
                  <p className="text-sm font-bold text-foreground truncate">
                    {user.fullName || user.primaryEmailAddress?.emailAddress}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              )}
              <DropdownMenuSeparator className="bg-border my-1" />
              <DropdownMenuItem 
                onClick={() => signOut({ redirectUrl: '/login' })}
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
