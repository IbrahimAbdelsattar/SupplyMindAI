// ── AI Command Center — Configuration Constants ──

import type { Severity } from './types';

/** Estimated at-risk dollar value per alert severity level */
export const ALERT_AT_RISK_VALUES: Record<Severity, number> = {
  critical: 8400,
  high: 12200,
  medium: 3200,
  low: 0,
};
