import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Search, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { alerts } from '@/lib/mockData';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export const DashboardHeader = ({ title, subtitle }: DashboardHeaderProps) => {
  const [dateRange, setDateRange] = useState('Last 7 days');

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-auto min-h-[56px] sm:h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-0 gap-2 sm:gap-0 pl-14 sm:pl-6"
    >
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-semibold truncate">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products, stores..."
            className="pl-10 w-64 h-9 bg-background"
          />
        </div>

        {/* Date Range */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{dateRange}</span>
              <span className="xs:hidden">7d</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={() => setDateRange('Today')}>Today</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDateRange('Last 7 days')}>Last 7 days</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDateRange('Last 30 days')}>Last 30 days</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDateRange('Last 90 days')}>Last 90 days</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9">
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
                {alerts.length}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 sm:w-80 bg-popover">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {alerts.slice(0, 4).map((alert) => (
              <DropdownMenuItem key={alert.id} className="flex flex-col items-start gap-1 p-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      alert.type === 'error'
                        ? 'destructive'
                        : alert.type === 'warning'
                        ? 'secondary'
                        : 'outline'
                    }
                    className="text-xs"
                  >
                    {alert.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{alert.time}</span>
                </div>
                <span className="text-sm font-medium">{alert.title}</span>
                <span className="text-xs text-muted-foreground">{alert.message}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
};
