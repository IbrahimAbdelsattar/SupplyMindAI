export const FORECAST_HORIZONS = [
  { labelKey: 'forecasting:horizon.1month', value: '30' },
  { labelKey: 'forecasting:horizon.3months', value: '90' },
  { labelKey: 'forecasting:horizon.6months', value: '180' },
];

export function forecastHorizon(value: string | null, fallback = '30') {
  return FORECAST_HORIZONS.find((option) => option.value === value)?.value ?? fallback;
}

export function forecastSelection(product: string, horizon: string) {
  return new URLSearchParams({ product, horizon });
}

export type RawMaterialBalance = {
  material_id: string;
  material_name: string;
  on_hand: number | null;
  updated_at: string | null;
};

export type MaterialRequirement = RawMaterialBalance & {
  quantity_per_unit: number;
  required: number;
  to_buy: number | null;
  remaining: number | null;
  first_shortage_period: string | null;
};

export type MaterialPlan = {
  product_id: string;
  horizon_days: number;
  forecast_units: number;
  monthly_demand: { period: string; predicted_demand: number }[];
  materials: MaterialRequirement[];
};
