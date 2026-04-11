import { motion } from 'framer-motion';
import { heatmapData, products, stores } from '@/lib/mockData';
import { cn } from '@/lib/utils';

const getHeatmapColor = (value: number) => {
  if (value < 80) return 'bg-primary/20';
  if (value < 120) return 'bg-primary/40';
  if (value < 160) return 'bg-primary/60';
  return 'bg-primary/80';
};

export const HeatmapChart = () => {
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
          <div className="grid grid-cols-6 gap-2 mb-2">
            <div className="text-xs text-muted-foreground font-medium"></div>
            {stores.map((store) => (
              <div key={store.id} className="text-xs text-muted-foreground font-medium text-center truncate">
                {store.name.replace(' Store', '')}
              </div>
            ))}
          </div>

          {/* Rows */}
          {products.map((product, productIndex) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: productIndex * 0.05 }}
              className="grid grid-cols-6 gap-2 mb-2"
            >
              <div className="text-xs text-muted-foreground font-medium flex items-center truncate pr-2">
                {product.name}
              </div>
              {stores.map((store) => {
                const data = heatmapData.find(
                  (d) => d.product === product.name && d.store === store.name
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
                    title={`${product.name} at ${store.name}: ${value} units`}
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
