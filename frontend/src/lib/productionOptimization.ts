export type OptimizationTarget = {
  product_id: string;
  units: number;
  due_day: number;
  minutes_per_unit: number;
  priority: number;
};

export type OptimizedScenario = {
  status: 'optimal' | 'feasible' | 'infeasible' | 'no_solution';
  daily_minutes: number;
  gap: number | null;
  gap_objective: 'service' | 'cost' | null;
  weighted_missed_units: number | null;
  spend_egp: string | null;
  targets: (Pick<OptimizationTarget, 'product_id' | 'due_day' | 'units'> & { missed_units: number })[];
  builds: { day: number; product_id: string; units: number; line_minutes: number }[];
  orders: { material_id: string; supplier_name: string; order_day: number; arrival_day: number; units: number; cost_egp: string }[];
  balances: { material_id: string; day: number; on_hand: number }[];
};

export type ProductionOptimizationResult = {
  materials: Record<string, string>;
  missing_stock: string[];
  missing_quotes: string[];
  baseline: OptimizedScenario | null;
  comparison: OptimizedScenario | null;
};
