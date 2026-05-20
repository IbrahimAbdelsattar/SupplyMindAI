import type { ChatResponse, InventoryResponse } from "@/data/inventory";

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchInventory() {
  const response = await fetch("/api/inventory");
  const payload = await readJson<{
    summary: {
      as_of: string;
      total_products: number;
      active_products: number;
      inactive_products: number;
      total_units: number;
      critical_products: number;
      low_products: number;
      healthy_products: number;
    };
    items: Array<{
      sku: string;
      name: string;
      category: string;
      product_type: string;
      active: boolean;
      stock: number;
      average_daily_demand: number;
      coverage_days: number | null;
      coverage_label: string;
      stock_status: string;
      last_updated: string;
      source_text: string;
    }>;
  }>(response);

  const data: InventoryResponse = {
    summary: {
      asOf: payload.summary.as_of,
      totalProducts: payload.summary.total_products,
      activeProducts: payload.summary.active_products,
      inactiveProducts: payload.summary.inactive_products,
      totalUnits: payload.summary.total_units,
      criticalProducts: payload.summary.critical_products,
      lowProducts: payload.summary.low_products,
      healthyProducts: payload.summary.healthy_products,
    },
    items: payload.items.map((item) => ({
      sku: item.sku,
      name: item.name,
      category: item.category,
      productType: item.product_type,
      active: item.active,
      stock: item.stock,
      averageDailyDemand: item.average_daily_demand,
      coverageDays: item.coverage_days,
      coverageLabel: item.coverage_label,
      stockStatus: item.stock_status,
      lastUpdated: item.last_updated,
      sourceText: item.source_text,
    })),
  };

  return data;
}

export async function askInventory(question: string, selectedSku: string | null) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      selected_sku: selectedSku,
    }),
  });

  return readJson<ChatResponse>(response);
}
