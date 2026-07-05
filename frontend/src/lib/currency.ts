export type Currency = 'usd' | 'eur' | 'gbp' | 'egp';

// Static conversion rates relative to USD. Adjust as needed or replace with dynamic API.
const conversionRates: Record<Currency, number> = {
  usd: 1,
  eur: 0.86, // 1 USD ≈ 0.86 EUR (Jun 2026)
  gbp: 0.75, // 1 USD ≈ 0.75 GBP (Jun 2026)
  egp: 52,   // 1 USD ≈ 52 EGP  (Jun 2026)
};

export const currencySymbols: Record<Currency, string> = {
  usd: '$',
  eur: '€',
  gbp: '£',
  egp: 'E£',
};

/**
 * Convert an amount in USD to the target currency.
 */
export function convertToCurrency(amountUsd: number, target: Currency): number {
  const rate = conversionRates[target];
  return amountUsd * rate;
}

/**
 * Format a monetary amount according to the selected currency.
 * If compact is true, it uses '1.2M' format for large numbers.
 */
export function formatCurrency(amountUsd: number, currency: Currency, compact: boolean = false): string {
  const converted = convertToCurrency(amountUsd, currency);
  const symbol = currencySymbols[currency] ?? '';
  
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 1 : 2,
  };
  
  if (compact) {
    options.notation = 'compact';
    options.compactDisplay = 'short';
  }

  const formattedNumber = new Intl.NumberFormat('en-US', options).format(converted);
  return `${symbol}${formattedNumber}`;
}

/**
 * Format a regular number compactly (e.g. 1,200,000 -> 1.2M)
 */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
}
