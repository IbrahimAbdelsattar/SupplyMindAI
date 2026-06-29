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
 * Returns a string like "$1,234.56" or "€1,234.56" (simple locale formatting).
 */
export function formatCurrency(amountUsd: number, currency: Currency): string {
  const converted = convertToCurrency(amountUsd, currency);
  const symbol = currencySymbols[currency] ?? '';
  // Use Intl.NumberFormat for locale-aware formatting (fallback to en-US).
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted);
  return `${symbol}${formattedNumber}`;
}
