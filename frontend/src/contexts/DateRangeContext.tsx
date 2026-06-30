import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

export type PeriodOption = 1 | 7 | 30 | 90;

type DateRangeContextType = {
  periodDays: PeriodOption;
  label: string;
  setPeriodDays: (days: PeriodOption) => void;
};

const labels: Record<PeriodOption, string> = {
  1: 'Today',
  7: 'Last 7 days',
  30: 'Last 30 days',
  90: 'Last 90 days',
};

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export const useDateRange = () => {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error('useDateRange must be used within DateRangeProvider');
  return ctx;
};

export const DateRangeProvider = ({ children }: { children: ReactNode }) => {
  const [periodDays, setPeriodDays] = useState<PeriodOption>(30);

  const value = useMemo(
    () => ({ periodDays, label: labels[periodDays], setPeriodDays }),
    [periodDays],
  );

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
};
