import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AIChatbot } from '@/components/chatbot/AIChatbot';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { generateDemandData, products, stores } from '@/lib/mockData';
import { Download, TrendingUp, Calendar, Sun, Tag } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Forecasting = () => {
  const { isAuthenticated } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState(products[0].id.toString());
  const [selectedStore, setSelectedStore] = useState(stores[0].id.toString());
  const [horizon, setHorizon] = useState('14');
  const [includeSeasonality, setIncludeSeasonality] = useState(true);
  const [includePromotions, setIncludePromotions] = useState(false);

  const chartData = useMemo(() => generateDemandData(parseInt(horizon)), [horizon]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleExport = () => {
    const csv = chartData
      .map((row) => `${row.date},${row.actual || ''},${row.forecast},${row.lower},${row.upper}`)
      .join('\n');
    const header = 'Date,Actual,Forecast,Lower,Upper\n';
    const blob = new Blob([header + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'forecast_export.csv';
    a.click();
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader 
          title="Demand Forecasting" 
          subtitle="AI-powered predictions with confidence intervals" 
        />

        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Forecast Parameters</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Configure the forecast model inputs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs sm:text-sm">
                      <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Product
                    </Label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger className="bg-background h-9 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs sm:text-sm">
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Store / Region
                    </Label>
                    <Select value={selectedStore} onValueChange={setSelectedStore}>
                      <SelectTrigger className="bg-background h-9 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {stores.map((store) => (
                          <SelectItem key={store.id} value={store.id.toString()}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs sm:text-sm">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Forecast Horizon
                    </Label>
                    <Select value={horizon} onValueChange={setHorizon}>
                      <SelectTrigger className="bg-background h-9 sm:h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="7">7 Days</SelectItem>
                        <SelectItem value="14">14 Days</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="60">60 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="seasonality" className="flex items-center gap-2 text-xs sm:text-sm">
                        <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Seasonality
                      </Label>
                      <Switch
                        id="seasonality"
                        checked={includeSeasonality}
                        onCheckedChange={setIncludeSeasonality}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="promotions" className="flex items-center gap-2 text-xs sm:text-sm">
                        <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Promotions
                      </Label>
                      <Switch
                        id="promotions"
                        checked={includePromotions}
                        onCheckedChange={setIncludePromotions}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Forecast Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-6">
                <div>
                  <CardTitle className="text-base sm:text-lg">Forecast Visualization</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Predicted demand with confidence bands</CardDescription>
                </div>
                <Button onClick={handleExport} variant="outline" className="gap-2 w-full sm:w-auto" size="sm">
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-60 sm:h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <defs>
                        <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} width={40} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Area
                        type="monotone"
                        dataKey="upper"
                        stroke="none"
                        fill="url(#confidenceGradient)"
                        name="Upper Bound"
                      />
                      <Area
                        type="monotone"
                        dataKey="lower"
                        stroke="none"
                        fill="hsl(var(--background))"
                        name="Lower Bound"
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
              </CardContent>
            </Card>
          </motion.div>

          {/* Forecast Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Predicted Quantities</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Daily forecast breakdown with confidence intervals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-auto -mx-3 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Date</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">Actual</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">Forecast</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm hidden sm:table-cell">Lower</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm hidden sm:table-cell">Upper</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chartData.slice(-14).map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                            {new Date(row.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </TableCell>
                          <TableCell className="text-right text-xs sm:text-sm">
                            {row.actual ? row.actual.toLocaleString() : '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-primary text-xs sm:text-sm">
                            {row.forecast.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">
                            {row.lower.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">
                            {row.upper.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>

      <AIChatbot />
    </div>
  );
};

export default Forecasting;
