// ── AI Command Center — Configuration Constants ──

import type { Severity } from './types';

/** Estimated at-risk dollar value per alert severity level */
export const ALERT_AT_RISK_VALUES: Record<Severity, number> = {
  critical: 8400,
  high: 12200,
  medium: 3200,
  low: 0,
};

/** Currency formatter options by locale */
export const CURRENCY_CONFIG = {
  'en-US': { code: 'USD', locale: 'en-US' },
  'ar-SA': { code: 'SAR', locale: 'ar-SA' },
  'fr-FR': { code: 'EUR', locale: 'fr-FR' },
} as const;

export type LocaleKey = keyof typeof CURRENCY_CONFIG;
