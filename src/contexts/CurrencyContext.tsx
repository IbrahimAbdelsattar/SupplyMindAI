import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Currency, formatCurrency as formatCurrencyUtil, convertToCurrency, currencySymbols } from '@/lib/currency';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (amountUsd: number) => string;
  convertCurrency: (amountUsd: number) => number;
  currencySymbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [currency, setCurrencyState] = useState<Currency>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('app_currency') as Currency) || 'usd';
    }
    return 'usd';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_currency', currency);
    }
  }, [currency]);

  // Load from backend on mount if authenticated
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await apiFetch<{ settings: any }>('/settings');
        const s = res?.settings || {};
        if (s.display && typeof s.display.currency === 'string') {
          setCurrencyState(s.display.currency as Currency);
        } else if (typeof s.currency === 'string') {
          setCurrencyState(s.currency as Currency);
        }
      } catch {
        // use default
      }
    };
    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated]);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
  };

  const formatCurrency = (amountUsd: number) => {
    return formatCurrencyUtil(amountUsd, currency);
  };

  const convertCurrency = (amountUsd: number) => {
    return convertToCurrency(amountUsd, currency);
  };

  const currencySymbol = currencySymbols[currency] || '$';

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, convertCurrency, currencySymbol }}>
      {children}
    </CurrencyContext.Provider>
  );
};
