export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  productType: string;
  active: boolean;
  stock: number;
  averageDailyDemand: number;
  coverageDays: number | null;
  coverageLabel: string;
  stockStatus: string;
  lastUpdated: string;
  sourceText: string;
}

export interface InventorySummary {
  asOf: string;
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalUnits: number;
  criticalProducts: number;
  lowProducts: number;
  healthyProducts: number;
}

export interface InventoryResponse {
  summary: InventorySummary;
  items: InventoryItem[];
}

export interface ChatResponse {
  answer: string;
}

export function formatCoverage(item: InventoryItem) {
  if (item.coverageDays === null) return item.coverageLabel;
  return `${item.coverageDays.toFixed(2)} days`;
}
