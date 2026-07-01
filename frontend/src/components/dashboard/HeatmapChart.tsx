import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';

type Product = { product_id: string; product_name: string };
type Store = { id: string; name: string };
type HeatmapCell = { product: string; store: string; demand: number };
type HeatmapResponse = { stores: Store[]; data: HeatmapCell[] };

const CELL_COLORS = [
  'bg-primary/10 text-muted-foreground',
  'bg-primary/25 text-primary-foreground',
  'bg-primary/45 text-primary-foreground',
  'bg-primary/65 text-primary-foreground',
  'bg-primary/85 text-primary-foreground',
] as const;

function getColorIndex(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.min(
    Math.floor(((value - min) / (max - min)) * CELL_COLORS.length),
    CELL_COLORS.length - 1,
  );
}

function HeatmapCell({ value, min, max, label }: { value: number; min: number; max: number; label: string }) {
  const colorClass = CELL_COLORS[getColorIndex(value, min, max)];
  return (
    <motion.div
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 350, damping: 20 }}
      className={cn(
        'h-12 rounded-2xl flex items-center justify-center text-[13px] font-bold',
        'relative cursor-default select-none',
        'motion-safe:transition-shadow motion-safe:duration-200',
        colorClass,
      )}
      aria-label={label}
    >
      <span className='drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]'>{value}</span>
    </motion.div>
  );
}

function HeatmapSkeleton({ storeCount }: { storeCount: number }) {
  const cols = `minmax(140px,1fr) repeat(${storeCount},minmax(80px,1fr))`;
  return (
    <div className="neu-card rounded-3xl p-6 lg:p-8 relative" role="status" aria-label="Loading demand heatmap">
      <div className="mb-8 space-y-3">
        <div className="h-6 w-44 rounded-lg bg-muted/30 animate-pulse" />
        <div className="h-4 w-56 rounded-md bg-muted/20 animate-pulse" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, r) => (
          <div key={r} className="grid gap-2" style={{ gridTemplateColumns: cols }}>
            <div className="h-4 w-20 rounded-md bg-muted/30 animate-pulse self-center" />
            {Array.from({ length: storeCount }).map((_, c) => (
              <div key={c} className="h-12 rounded-2xl bg-muted/10 animate-pulse" />
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Loading heatmap data…</span>
    </div>
  );
}

export const HeatmapChart = () => {
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [apiStores, setApiStores] = useState<Store[]>([{ id: 's1', name: 'Store 1' }]);
  const [apiData, setApiData] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [prods, heat] = await Promise.all([
          fetchApi('/data/products') as Promise<Product[]>,
          fetchApi('/data/heatmap') as Promise<HeatmapResponse>,
        ]);
        if (cancelled) return;
        if (prods) setApiProducts(prods);
        if (heat) {
          setApiData(heat.data);
          if (heat.stores?.length) setApiStores(heat.stores);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load heatmap');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

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

  if (loading) return <HeatmapSkeleton storeCount={apiStores.length} />;

  if (error) {
    return (
      <div className="neu-card rounded-3xl p-6 lg:p-8 relative" role="alert">
        <div className="flex flex-col items-center py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">Unable to load heatmap</h3>
          <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (apiProducts.length === 0) {
    return (
      <div className="neu-card rounded-3xl p-6 lg:p-8 relative">
        <div className="flex flex-col items-center py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">No product data</h3>
          <p className="text-sm text-muted-foreground">Add products to see the demand heatmap.</p>
        </div>
      </div>
    );
  }

  const gridCols = `minmax(140px,1fr) repeat(${apiStores.length},minmax(80px,1fr))`;
  return (
    <div className="neu-card rounded-3xl p-6 lg:p-8 overflow-hidden relative">
      <div
        className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none motion-safe:opacity-100 opacity-0"
        style={{ background: 'radial-gradient(circle at 70% 30%, hsl(var(--primary) / 0.08), transparent 70%)' }}
        aria-hidden="true"
      />
      <div className="mb-8 relative z-10">
        <h3 className="text-xl font-bold text-foreground tracking-tight">
          Demand Heatmap
          <span className="ml-2 text-xs font-medium text-muted-foreground align-middle">
            ({apiStores.length} store{apiStores.length !== 1 ? 's' : ''})
          </span>
        </h3>
        <p className="text-[15px] font-medium text-muted-foreground mt-1">
          Product demand intensity by store
        </p>
      </div>

      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden pb-2 relative z-10 scrollbar-thin scrollbar-thumb-muted/30 scrollbar-track-transparent hover:scrollbar-thumb-muted/50 motion-safe:transition-colors motion-safe:duration-200"
      >
        <div className="min-w-[500px]" role="grid" aria-label="Demand heatmap by product and store">
          <div className="grid gap-2 mb-3 px-1" style={{ gridTemplateColumns: gridCols }} role="row">
            <div role="columnheader" className="text-[12px] text-muted-foreground font-bold tracking-wider uppercase" />
            {apiStores.map((store) => (
              <div
                key={store.id}
                role="columnheader"
                aria-label={store.name}
                className="text-[12px] text-muted-foreground font-bold tracking-wider uppercase text-center truncate px-1"
              >
                {store.name.replace(/ Store$/, '').replace(/^Store /, '')}
              </div>
            ))}
          </div>
          {apiProducts.map((product, productIndex) => (
            <motion.div
              key={product.product_id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: productIndex * 0.04, ease: [0.23, 1, 0.32, 1] }}
              className="grid gap-2 mb-2 px-1"
              style={{ gridTemplateColumns: gridCols }}
              role="row"
            >
              <div
                role="rowheader"
                className={cn('sticky left-0 z-10 bg-background text-[14px] text-foreground font-bold flex items-center truncate pr-3')}
              >
                {product.product_name}
              </div>
              {apiStores.map((store) => {
                const found = apiData.find(
                  (d) => d.product === product.product_name && d.store === store.name,
                );
                const value = found?.demand ?? 0;
                return (
                  <HeatmapCell
                    key={store.id}
                    value={value}
                    min={minDemand}
                    max={maxDemand}
                    label={`${product.product_name} at ${store.name}: ${value} units`}
                  />
                );
              })}
            </motion.div>
          ))}
        </div>
      </div>

      <div
        className="flex items-center justify-center gap-3 mt-8 pt-6 border-t border-border/40 relative z-10"
        aria-label="Heatmap intensity scale"
      >
        <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">Low</span>
        <div className="flex gap-1.5" role="list" aria-label="5-stop color scale">
          {CELL_COLORS.map((cls, i) => (
            <div
              key={i}
              className={cn('w-7 h-7 rounded-[10px]', cls.split(' ')[0])}
              role="listitem"
              aria-label={`Level ${i + 1}`}
            />
          ))}
        </div>
        <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">High</span>
      </div>
    </div>
  );
};
