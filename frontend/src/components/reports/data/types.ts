export type ReportType = 'forecast' | 'inventory' | 'executive' | 'technical' | 'risk' | 'supply_chain' | 'custom';
export type ReportStatus = 'ready' | 'generating' | 'error';

export interface ReportItem {
  id: string;
  title: string;
  description?: string;
  type: ReportType;
  format?: string;
  date?: string;
  generated_at?: string;
  status: ReportStatus;
  file_size?: number;
  download_url?: string;
  period_start?: string;
  period_end?: string;
}

export interface InventorySummary {
  totalProducts: number;
  healthyProducts: number;
  lowStockProducts?: number;
  stockoutProducts?: number;
}

export interface Recommendation {
  product_id?: string;
  product_name?: string;
  costSavings: number;
  riskLevel: string;
  suggestedQty?: number;
  reason?: string;
}

export interface ForecastPrediction {
  product_id: string;
  product_name?: string;
  predicted_demand?: number;
  confidence?: number;
}

export interface ReportCategory {
  key: string;
  label: string;
  count: number;
  lastGenerated?: string;
  totalSize: number;
}

export interface ReportMetric {
  label: string;
  value: string | number;
  change?: number;
  icon: string;
}
