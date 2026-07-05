/* ── Alerts data types ── */

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertType = 'stockout' | 'low_stock' | 'critical_stock' | 'overstock';

export type AlertItem = {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  product_id: string;
  created_at: string;
  acknowledged?: boolean;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
};

export type AlertsResponse = {
  alerts: AlertItem[];
  total: number;
  error?: string;
};

export type SeverityCounts = {
  critical: number;
  high: number;
  medium: number;
  low: number;
};
