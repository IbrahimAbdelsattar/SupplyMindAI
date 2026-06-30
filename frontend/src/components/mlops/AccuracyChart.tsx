import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { AccuracyPoint } from './types';

type Props = {
  data: AccuracyPoint[];
};

const chartConfig = {
  accuracy: { label: 'Accuracy', color: 'hsl(var(--chart-1))' },
} as const;

export const AccuracyChart = ({ data }: Props) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.4 }}
  >
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">Model Accuracy Trend</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Weekly forecast accuracy over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-52 sm:h-80">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
            <defs>
              <linearGradient id="accuracyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accuracy)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--color-accuracy)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              interval="preserveStartEnd"
              tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis
              domain={[80, 96]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              width={35}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Accuracy']}
                />
              }
            />
            <ReferenceLine
              y={90}
              stroke="hsl(var(--chart-3))"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Target 90%',
                position: 'right',
                fill: 'hsl(var(--chart-3))',
                fontSize: 10,
              }}
            />
            <Area
              type="monotone"
              dataKey="accuracy"
              stroke="none"
              fill="url(#accuracyFill)"
            />
            <Line
              type="monotone"
              dataKey="accuracy"
              stroke="var(--color-accuracy)"
              strokeWidth={2.5}
              dot={{ fill: 'var(--color-accuracy)', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              name="accuracy"
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  </motion.div>
);
