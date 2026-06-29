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
  { label: '7 Days', value: 7 },
  { label: '14 Days', value: 14 },
  { label: '30 Days', value: 30 },
];

export const DemandChart = () => {
  const [selectedRange, setSelectedRange] = useState(14);
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

  // Auto-run when filters change
  useEffect(() => {
    if (products?.length) {
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
      </div>
    </div>
  );
};

