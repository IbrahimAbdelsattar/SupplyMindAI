import { useState, useMemo } from 'react';
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
import { generateDemandData, products } from '@/lib/mockData';

const timeRanges = [
  { label: '7 Days', value: 7 },
  { label: '14 Days', value: 14 },
  { label: '30 Days', value: 30 },
];

export const DemandChart = () => {
  const [selectedRange, setSelectedRange] = useState(14);
  const [selectedProduct, setSelectedProduct] = useState('all');

  const chartData = useMemo(() => generateDemandData(selectedRange), [selectedRange]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-card border border-border rounded-2xl p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold">Demand Forecast</h3>
          <p className="text-sm text-muted-foreground">Actual vs Predicted demand</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-40 bg-background">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Products</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id.toString()}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex rounded-lg border border-border p-1">
            {timeRanges.map((range) => (
              <Button
                key={range.value}
                variant={selectedRange === range.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedRange(range.value)}
                className="px-3"
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            />
            <Legend />
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
              fill="hsl(var(--background))"
              name=""
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--accent))', strokeWidth: 0, r: 3 }}
              name="Actual"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
              name="Forecast"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
