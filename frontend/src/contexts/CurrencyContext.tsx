import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Currency, formatCurrency as formatCurrencyUtil, convertToCurrency, currencySymbols } from '@/lib/currency';
import { apiFetch } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (amountEgp: number, compact?: boolean) => string;
  convertCurrency: (amountEgp: number) => number;
  currencySymbol: string;
}

interface StoredSettings {
  currency?: string;
  display?: {
    currency?: string;
  };
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
  const { user } = useAuthContext();
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

  // Load currency preference from backend
  useEffect(() => {
    if (!user) return;
    const loadSettings = async () => {
      try {
        const res = await apiFetch<{ settings: StoredSettings }>('/settings');
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
    loadSettings();
  }, [user]);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
  };

  const formatCurrency = (amountEgp: number, compact: boolean = false) => {
    return formatCurrencyUtil(amountEgp, currency, compact);
  };

  const convertCurrency = (amountEgp: number) => {
    return convertToCurrency(amountEgp, currency);
  };

  const currencySymbol = currencySymbols[currency] || '$';

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, convertCurrency, currencySymbol }}>
      {children}
    </CurrencyContext.Provider>
  );
};
