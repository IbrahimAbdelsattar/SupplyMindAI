import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

type Product = { product_id: string; product_name: string; category?: string };
type ForecastPoint = { date: string; actual?: number | null; forecast: number; lower: number; upper: number };
type ForecastResponse = { product_id: string; horizon_days: number; series: ForecastPoint[] };

const timeRanges = [
  { label: '1 Month', value: 30 },
  { label: '3 Months', value: 90 },
  { label: '6 Months', value: 180 },
];

export const DemandChart = () => {
  const [selectedRange, setSelectedRange] = useState(90);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch<Product[]>('/data/products'),
  });

  const forecastMutation = useMutation({
    mutationFn: async () => {
      const firstProductId = products?.[0]?.product_id;
      const productId = selectedProduct === 'all' ? firstProductId : selectedProduct;
      if (!productId) return null;
      return apiFetch<ForecastResponse>('/forecast/predict', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, horizon_days: selectedRange }),
      });
    },
  });

  const chartData = useMemo(() => {
    const data = forecastMutation.data?.series;
    if (data?.length) return data;
    return [];
  }, [forecastMutation.data]);

  // Auto-run when filters change (only if we already have data)
  useEffect(() => {
    if (products?.length && chartData.length > 0) {
      void forecastMutation.mutateAsync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRange, selectedProduct, products?.length]);

  return (
    <div className="neu-panel rounded-3xl p-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
        <div>
          <h3 className="text-xl font-bold text-foreground tracking-tight">Demand Forecast</h3>
          <p className="text-[15px] font-medium text-muted-foreground mt-1">Actual vs Predicted demand</p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-[180px] h-11 neu-panel-inset border-none rounded-xl text-[15px] font-medium text-foreground focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent className="neu-panel border-none rounded-xl">
              <SelectItem value="all" className="focus:bg-background rounded-lg font-medium cursor-pointer">All Products</SelectItem>
              {(products ?? []).map((product) => (
                <SelectItem key={product.product_id} value={product.product_id} className="focus:bg-background rounded-lg font-medium cursor-pointer">
                  {product.product_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex rounded-xl p-1.5 neu-panel-inset gap-1">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setSelectedRange(range.value)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  selectedRange === range.value 
                    ? 'neu-panel text-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[320px]">
        {forecastMutation.isPending ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </motion.div>
              <span className="text-sm font-medium">Generating forecast…</span>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground max-w-[200px]">Select a product and time range, then generate a forecast.</p>
              <motion.button
                onClick={() => void forecastMutation.mutateAsync()}
                disabled={!products?.length}
                className="neu-panel active:neu-button-active text-primary font-bold rounded-xl px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-40"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                Generate Forecast
              </motion.button>
            </div>
          </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }} 
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--neu-bg)',
                border: 'none',
                boxShadow: '8px 8px 16px var(--neu-shadow-dark), -8px -8px 16px var(--neu-shadow-light)',
                borderRadius: '16px',
                fontWeight: 600,
                color: 'var(--neu-text)'
              }}
              labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            />
            <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 600 }} iconType="circle" />
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill="hsl(var(--accent))"
              fillOpacity={0.1}
              name="Confidence Range"
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="none"
              fill="var(--neu-bg)"
              name=""
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--accent))"
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--accent))', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              name="Actual"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              strokeDasharray="6 6"
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              name="Forecast"
            />
          </ComposedChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

