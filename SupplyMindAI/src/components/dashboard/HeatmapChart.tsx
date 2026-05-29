import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

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
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [apiStores, setApiStores] = useState<Store[]>([{ id: 's1', name: 'Store 1' }]);
  const [apiData, setApiData] = useState<HeatmapCell[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const prods = await fetchApi('/data/products') as Product[];
        if (prods) setApiProducts(prods);

        const heat = await fetchApi('/data/heatmap') as HeatmapResponse;
        if (heat) {
          setApiData(heat.data);
          if (heat.stores?.length) setApiStores(heat.stores);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-card border border-border rounded-2xl p-6"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Demand Heatmap</h3>
        <p className="text-sm text-muted-foreground">Product demand intensity by store</p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Header */}
          <div
            className="grid gap-2 mb-2"
            style={{ gridTemplateColumns: `minmax(140px, 1fr) repeat(${apiStores.length}, minmax(90px, 1fr))` }}
          >
            <div className="text-xs text-muted-foreground font-medium"></div>
            {apiStores.map((store) => (
              <div key={store.id} className="text-xs text-muted-foreground font-medium text-center truncate">
                {store.name.replace(' Store', '')}
              </div>
            ))}
          </div>

          {/* Rows */}
          {apiProducts.map((product, productIndex) => (
            <motion.div
              key={product.product_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: productIndex * 0.05 }}
              className="grid gap-2 mb-2"
              style={{ gridTemplateColumns: `minmax(140px, 1fr) repeat(${apiStores.length}, minmax(90px, 1fr))` }}
            >
              <div className="text-xs text-muted-foreground font-medium flex items-center truncate pr-2">
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
                    whileHover={{ scale: 1.05 }}
                    className={cn(
                      'h-10 rounded-lg flex items-center justify-center text-xs font-medium cursor-pointer transition-colors',
                      getHeatmapColor(value),
                      'text-primary-foreground'
                    )}
                    title={`${product.product_name} at ${store.name}: ${value} units`}
                  >
                    {value}
                  </motion.div>
                );
              })}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-border">
        <span className="text-xs text-muted-foreground">Low</span>
        <div className="flex gap-1">
          <div className="w-6 h-4 rounded bg-primary/20"></div>
          <div className="w-6 h-4 rounded bg-primary/40"></div>
          <div className="w-6 h-4 rounded bg-primary/60"></div>
          <div className="w-6 h-4 rounded bg-primary/80"></div>
        </div>
        <span className="text-xs text-muted-foreground">High</span>
      </div>
    </motion.div>
  );
};
