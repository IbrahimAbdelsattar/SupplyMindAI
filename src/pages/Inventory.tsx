import { motion } from 'framer-motion';
import { useState } from 'react';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';



import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Package, AlertTriangle, DollarSign, ArrowRight } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

type InventoryRecommendation = {
  product_id: string;
  product_name: string;
  currentStock: number;
  reorderPoint: number;
  reorderQty: number;
  safetyStock: number;
  leadTime: number;
  costSavings: number;
  riskLevel: 'low' | 'medium' | 'high';
};

const Inventory = () => {
  const { isAuthenticated } = useAuth();
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const { data: inventoryRecommendations = [] } = useQuery({
    queryKey: ['inventory-optimize', 13],
    queryFn: () => apiFetch<InventoryRecommendation[]>('/inventory/optimize?limit=13'),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const question = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: 'user', content: question }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const topRiskSku = inventoryRecommendations[0]?.product_id;
      const res = await apiFetch<{ response: string }>('/insights/chat', {
        method: 'POST',
        body: JSON.stringify({ message: question, selected_sku: topRiskSku }),
      });
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.response }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Unable to reach inventory assistant.',
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const totalSavings = inventoryRecommendations.reduce((sum, item) => sum + item.costSavings, 0);

  const comparisonData = inventoryRecommendations.map((item) => ({
    name: item.product_name.split(' ').slice(0, 2).join(' '),
    current: item.currentStock,
    optimal: item.reorderPoint + item.safetyStock,
  }));

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader 
          title="Inventory Optimization" 
          subtitle="AI-driven recommendations for optimal stock levels" 
        />

        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-success/30 bg-success/5">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-success/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Est. Cost Savings</p>
                      <p className="text-xl sm:text-2xl font-bold text-success">
                        ${totalSavings.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card>
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Products Analyzed</p>
                      <p className="text-xl sm:text-2xl font-bold">{inventoryRecommendations.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card>
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">High Risk Items</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {inventoryRecommendations.filter((i) => i.riskLevel === 'high').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">AI Recommendations</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Optimized inventory parameters for each product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {inventoryRecommendations.map((item, index) => (
                  <motion.div
                    key={item.product_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="p-3 sm:p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                  >
                    <div className="flex flex-col gap-3 sm:gap-4">
                      {/* Product header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <h4 className="text-sm sm:text-lg font-semibold">{item.product_name}</h4>
                          <Badge
                            variant={
                              item.riskLevel === 'high'
                                ? 'destructive'
                                : item.riskLevel === 'medium'
                                ? 'secondary'
                                : 'outline'
                            }
                            className="text-xs"
                          >
                            {item.riskLevel} risk
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-muted-foreground">Savings</p>
                            <p className="text-sm sm:text-lg font-bold text-success">
                              +${item.costSavings.toLocaleString()}
                            </p>
                          </div>
                          <Button size="sm" className="gap-1 h-8 text-xs sm:text-sm">
                            Apply
                            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-4 gap-2 sm:gap-4">
                        <div className="text-center">
                          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Stock</p>
                          <p className={cn(
                            "text-sm sm:text-xl font-bold",
                            item.currentStock < item.reorderPoint ? 'text-destructive' : ''
                          )}>
                            {item.currentStock}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Reorder Pt</p>
                          <p className="text-sm sm:text-xl font-bold text-primary">{item.reorderPoint}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Reorder Qty</p>
                          <p className="text-sm sm:text-xl font-bold text-accent">{item.reorderQty}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Safety</p>
                          <p className="text-sm sm:text-xl font-bold">{item.safetyStock}</p>
                        </div>
                      </div>

                      {/* Mobile savings row */}
                      <div className="flex items-center justify-between sm:hidden text-xs text-muted-foreground">
                        <span>Lead time: {item.leadTime} days</span>
                        <span className="font-bold text-success">+${item.costSavings.toLocaleString()}</span>
                      </div>

                      {/* Stock Level Progress */}
                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
                          <span className="text-muted-foreground">Stock Level</span>
                          <span className="font-medium">
                            {Math.round((item.currentStock / (item.reorderPoint + item.safetyStock)) * 100)}%
                          </span>
                        </div>
                        <Progress 
                          value={(item.currentStock / (item.reorderPoint + item.safetyStock)) * 100}
                          className="h-1.5 sm:h-2"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Comparison Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Current vs Optimal Stock</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Before and after optimization comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-60 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
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
                      <Bar dataKey="current" name="Current Stock" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="optimal" name="Optimal Level" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* RAG Assistant */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Inventory Assistant</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Ask questions about inventory policies and status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col h-80 space-y-4">
                  <div className="flex-1 overflow-y-auto space-y-4 border rounded-md p-4 bg-muted/20">
                    {chatMessages.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center mt-10">
                        Ask a question like "Which product is at risk of stockout?" or "What's the lead time for BL_KIT?"
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3 text-sm animate-pulse">Thinking...</div>
                      </div>
                    )}
                  </div>
                  <form onSubmit={handleChatSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask about inventory..."
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <button type="submit" disabled={isChatLoading || !chatInput.trim()} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                      Send
                    </button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </motion.div>

        </main>
      </div>



    </div>
  );
};

export default Inventory;
