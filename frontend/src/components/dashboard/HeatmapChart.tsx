import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

type Product = { product_id: string; product_name: string };
type Store = { id: string; name: string };
type HeatmapCell = { product: string; store: string; demand: number };
type HeatmapResponse = { stores: Store[]; data: HeatmapCell[] };

const SCALE_STOPS = 9;

function interpolateColor(t: number): string {
  // Brand: Blue (primary) → Teal (secondary) → Orange (warning)
  if (t < 0.5) {
    const s = t * 2;
    const h = 221 + s * -61;  // 221 → 160
    const l = 85 - s * 25;   // 85 → 60
    const sat = 83 - s * 1;  // 83 → 82
    return `hsl(${h}, ${sat}%, ${l}%)`;
  }
  const s = (t - 0.5) * 2;
  const h = 160 + s * -135; // 160 → 25
  const l = 60 - s * 7;     // 60 → 53
  const sat = 82 + s * 13;  // 82 → 95
  return `hsl(${h}, ${sat}%, ${l}%)`;
}

function interpolateTextColor(t: number): string {
  return t > 0.6 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)';
}

function getColor(value: number, min: number, max: number): { bg: string; fg: string } {
  if (max <= min) return { bg: interpolateColor(0), fg: interpolateTextColor(0) };
  const t = (value - min) / (max - min);
  return { bg: interpolateColor(t), fg: interpolateTextColor(t) };
}

function formatDemand(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

function HeatmapCellComponent({
  value, min, max, label,
}: { value: number; min: number; max: number; label: string }) {
  const { bg, fg } = getColor(value, min, max);
  return (
    <div
      className="h-10 rounded-lg flex items-center justify-center text-[13px] font-semibold
                 cursor-default select-none transition-[transform,opacity] duration-150 ease-out
                 hover:scale-[1.05] hover:opacity-90 relative z-0 hover:z-10"
      style={{ backgroundColor: bg, color: fg }}
      aria-label={label}
    >
      {formatDemand(value)}
    </div>
  );
}

function HeatmapSkeleton({ storeCount }: { storeCount: number }) {
  const cols = `minmax(130px,1fr) repeat(${storeCount},minmax(72px,1fr)) 60px`;
  return (
    <div className="neu-card rounded-3xl p-6 lg:p-8" role="status" aria-label="Loading demand heatmap">
      <div className="mb-6 space-y-2">
        <div className="h-5 w-40 rounded-lg bg-muted/30 animate-pulse" />
        <div className="h-3.5 w-52 rounded-md bg-muted/20 animate-pulse" />
      </div>
      <div className="space-y-1.5">
        {Array.from({ length: 5 }).map((_, r) => (
          <div key={r} className="grid gap-1.5" style={{ gridTemplateColumns: cols }}>
            <div className="h-3.5 w-16 rounded bg-muted/30 animate-pulse self-center" />
            {Array.from({ length: storeCount + 1 }).map((_, c) => (
              <div key={c} className="h-10 rounded-lg bg-muted/10 animate-pulse" />
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Loading heatmap data…</span>
    </div>
  );
}

export const HeatmapChart = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['heatmapData'],
    queryFn: async () => {
      const [prods, heat] = await Promise.all([
        fetchApi('/data/products') as Promise<Product[]>,
        fetchApi('/data/heatmap') as Promise<HeatmapResponse>,
      ]);
      return { prods, heat };
    },
    staleTime: 5 * 60 * 1000,
  });

  const apiProducts = data?.prods || [];
  const apiData = data?.heat?.data || [];
  const apiStores = data?.heat?.stores || [];

  const { minDemand, maxDemand } = useMemo(() => {
    if (apiData.length === 0) return { minDemand: 0, maxDemand: 200 };
    let mn = Infinity, mx = -Infinity;
    for (const d of apiData) {
      if (d.demand < mn) mn = d.demand;
      if (d.demand > mx) mx = d.demand;
    }
    if (mx === mn) mx = mn + 1;
    return { minDemand: mn, maxDemand: mx };
  }, [apiData]);

  const productTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const d of apiData) {
      totals[d.product] = (totals[d.product] || 0) + d.demand;
    }
    return totals;
  }, [apiData]);

  if (loading) return <HeatmapSkeleton storeCount={apiStores.length} />;

  if (error) {
    return (
      <div className="neu-card rounded-3xl p-6 lg:p-8" role="alert">
        <div className="flex flex-col items-center py-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">Unable to load heatmap</h3>
          <p className="text-sm text-muted-foreground max-w-xs">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  if (apiProducts.length === 0) {
    return (
      <div className="neu-card rounded-3xl p-6 lg:p-8">
        <div className="flex flex-col items-center py-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-muted/20 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">No product data</h3>
          <p className="text-sm text-muted-foreground">Add products to see the demand heatmap.</p>
        </div>
      </div>
    );
  }

  const gridCols = `minmax(130px,1fr) repeat(${apiStores.length},minmax(72px,1fr)) 60px`;

  return (
    <div className="neu-card rounded-3xl p-6 lg:p-8 overflow-hidden">
      {/* Header */}
      <div className="mb-5">
        <h3 className="text-lg font-bold text-foreground tracking-tight">
          Demand Heatmap
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Product demand intensity across {apiStores.length} store{apiStores.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Grid */}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden pb-1 scrollbar-thin scrollbar-thumb-muted/30 scrollbar-track-transparent"
      >
        <div className="min-w-[480px]" role="grid" aria-label="Demand heatmap by product and store">
          {/* Column headers */}
          <div
            className="grid gap-1.5 mb-2 px-0.5"
            style={{ gridTemplateColumns: gridCols }}
            role="row"
          >
            <div role="columnheader" className="text-[11px] text-muted-foreground font-semibold tracking-wider uppercase" />
            {apiStores.map((store) => (
              <div
                key={store.id}
                role="columnheader"
                aria-label={store.name}
                className="text-[11px] text-muted-foreground font-semibold tracking-wider uppercase text-center truncate px-0.5"
              >
                {store.name.replace(/ Store$/, '').replace(/^Store /, '')}
              </div>
            ))}
            <div role="columnheader" className="text-[11px] text-muted-foreground font-semibold tracking-wider uppercase text-center">
              Total
            </div>
          </div>

          {/* Rows */}
          {apiProducts.map((product, productIndex) => (
            <motion.div
              key={product.product_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: productIndex * 0.03, ease: [0.23, 1, 0.32, 1] }}
              className="grid gap-1.5 mb-1.5 px-0.5"
              style={{ gridTemplateColumns: gridCols }}
              role="row"
            >
              <div
                role="rowheader"
                className="sticky left-0 z-10 bg-background text-[13px] text-foreground font-semibold flex items-center truncate pr-2"
              >
                {product.product_name}
              </div>
              {apiStores.map((store) => {
                const found = apiData.find(
                  (d) => d.product === product.product_name && d.store === store.name,
                );
                const value = found?.demand ?? 0;
                return (
                  <HeatmapCellComponent
                    key={store.id}
                    value={value}
                    min={minDemand}
                    max={maxDemand}
                    label={`${product.product_name} at ${store.name}: ${value} units`}
                  />
                );
              })}
              <div className="h-10 rounded-lg flex items-center justify-center text-[13px] font-bold text-muted-foreground bg-muted/20">
                {formatDemand(productTotals[product.product_name] || 0)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/30">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {minDemand}
          </span>
          <div className="flex gap-0.5" role="list" aria-label="Demand intensity scale">
            {Array.from({ length: SCALE_STOPS }).map((_, i) => {
              const t = i / (SCALE_STOPS - 1);
              const { bg } = getColor(
                minDemand + t * (maxDemand - minDemand),
                minDemand,
                maxDemand,
              );
              return (
                <div
                  key={i}
                  className="w-6 h-3 first:rounded-l last:rounded-r"
                  style={{ backgroundColor: bg }}
                  role="listitem"
                  aria-label={`Level ${i + 1}`}
                />
              );
            })}
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {maxDemand}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <div className="w-5 h-5 rounded bg-muted/20 flex items-center justify-center text-[10px] font-bold">
            123
          </div>
          <span>= Total</span>
        </div>
      </div>
    </div>
  );
};
