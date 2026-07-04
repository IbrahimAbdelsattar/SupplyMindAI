import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Search, Calendar } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useDateRange } from '@/contexts/DateRangeContext';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export const DashboardHeader = ({ title, subtitle }: DashboardHeaderProps) => {
  const { t } = useTranslation();
  const { label: dateRange, setPeriodDays } = useDateRange();

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
            <DropdownMenuItem onClick={() => setPeriodDays?.(1)} className="rounded-xl font-medium focus:bg-background focus:text-primary cursor-pointer p-3">{t('common:dateRange.today')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriodDays?.(7)} className="rounded-xl font-medium focus:bg-background focus:text-primary cursor-pointer p-3">{t('common:dateRange.last7days')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriodDays?.(30)} className="rounded-xl font-medium focus:bg-background focus:text-primary cursor-pointer p-3">{t('common:dateRange.last30days')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriodDays?.(90)} className="rounded-xl font-medium focus:bg-background focus:text-primary cursor-pointer p-3">{t('common:dateRange.last90days')}</DropdownMenuItem>

          </DropdownMenuContent>

        </DropdownMenu>

      </div>
    </motion.header>
  );
};
