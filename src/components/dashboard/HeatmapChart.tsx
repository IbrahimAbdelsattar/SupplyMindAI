import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@clerk/clerk-react';

type Product = {
  product_id: string;
  product_name: string;
};

type Store = {
  id: string;
  name: string;
};

type HeatmapCell = {
  product: string;
  store: string;
  demand: number;
};

type HeatmapResponse = {
  stores: Store[];
  data: HeatmapCell[];
};

const getHeatmapColor = (value: number) => {
  if (value < 80) return 'bg-primary/20';
  if (value < 120) return 'bg-primary/40';
  if (value < 160) return 'bg-primary/60';
  return 'bg-primary/80';
};

export const HeatmapChart = () => {
  const { getToken } = useAuth();
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [apiStores, setApiStores] = useState<Store[]>([{ id: 's1', name: 'Store 1' }]);
  const [apiData, setApiData] = useState<HeatmapCell[]>([]);

  useEffect(() => {
    let cancelled = false;

    const waitForToken = async (timeoutMs: number) => {
      const start = Date.now();
      while (!cancelled && Date.now() - start < timeoutMs) {
        const token = await getToken();
        if (token) return token;
        await new Promise((r) => setTimeout(r, 250));
      }
      return null;
    };

    const loadData = async () => {
      try {
        const token = await waitForToken(2000);
        if (!token) return;

        const prods = await fetchApi('/data/products') as Product[];
        if (prods && !cancelled) setApiProducts(prods);

        const heat = await fetchApi('/data/heatmap') as HeatmapResponse;
        if (heat && !cancelled) {
          setApiData(heat.data);
          if (heat.stores?.length) setApiStores(heat.stores);
        }
      } catch (err) {
        console.error(err);
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [getToken]);
  return (
    <div className="neu-panel rounded-3xl p-6 lg:p-8 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
      
      <div className="mb-8 relative z-10">
        <h3 className="text-xl font-bold text-foreground tracking-tight">Demand Heatmap</h3>
        <p className="text-[15px] font-medium text-muted-foreground mt-1">Product demand intensity by store</p>
      </div>

      <div className="overflow-x-auto pb-4 scrollbar-none relative z-10">
        <div className="min-w-[500px]">
          {/* Header */}
          <div
            className="grid gap-3 mb-4"
            style={{ gridTemplateColumns: `minmax(140px, 1fr) repeat(${apiStores.length}, minmax(90px, 1fr))` }}
          >
            <div className="text-[13px] text-muted-foreground font-bold tracking-wider uppercase"></div>
            {apiStores.map((store) => (
              <div key={store.id} className="text-[13px] text-muted-foreground font-bold tracking-wider uppercase text-center truncate">
                {store.name.replace(' Store', '')}
              </div>
            ))}
          </div>

          {/* Rows */}
          {apiProducts.map((product, productIndex) => (
            <motion.div
              key={product.product_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: productIndex * 0.05, ease: [0.23, 1, 0.32, 1] }}
              className="grid gap-3 mb-3"
              style={{ gridTemplateColumns: `minmax(140px, 1fr) repeat(${apiStores.length}, minmax(90px, 1fr))` }}
            >
              <div className="text-[14px] text-foreground font-bold flex items-center truncate pr-2 rtl:pl-2 rtl:pr-0">
                {product.product_name}
              </div>
              {apiStores.map((store) => {
                const data = apiData.find(
                  (d) => d.product === product.product_name && d.store === store.name
                );
                const value = data?.demand || 0;
                return (
                  <motion.div
                    key={store.id}
                    whileHover={{ scale: 1.15, zIndex: 10, rotate: value % 2 === 0 ? 1 : -1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={cn(
                      'h-12 rounded-2xl flex items-center justify-center text-[13px] font-bold cursor-pointer relative shadow-sm',
                      getHeatmapColor(value),
                      'text-primary-foreground'
                    )}
                    title={`${product.product_name} at ${store.name}: ${value} units`}
                  >
                    <span className="drop-shadow-md">{value}</span>
                  </motion.div>
                );
              })}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-border/40 relative z-10">
        <span className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest">Low</span>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/20 shadow-sm"></div>
          <div className="w-8 h-8 rounded-xl bg-primary/40 shadow-sm"></div>
          <div className="w-8 h-8 rounded-xl bg-primary/60 shadow-sm"></div>
          <div className="w-8 h-8 rounded-xl bg-primary/80 shadow-sm"></div>
        </div>
        <span className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest">High</span>
      </div>
    </div>
  );
};
