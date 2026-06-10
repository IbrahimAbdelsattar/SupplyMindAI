import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AIChatbot } from '@/components/chatbot/AIChatbot';
import { AISummaryCard } from '@/components/ai/AISummaryCard';
import { FormattedMessage } from '@/components/ai/FormattedMessage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Brain, TrendingUp, Calendar, Sun, Tag, Lightbulb, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';

type Product = { product_id: string; product_name: string };

type InsightItem = {
  title: string;
  description: string;
  impact: string;
  direction: string;
  factor: string;
  confidence: number;
};

type InsightsResponse = {
  insights: InsightItem[];
  executive_summary: string;
  recommendations: string[];
};

const defaultFactors = [
  { key: 'seasonality', name: 'Seasonality', weight: 35, icon: Sun, color: 'primary' },
  { key: 'historicalTrends', name: 'Historical Trends', weight: 25, icon: TrendingUp, color: 'accent' },
  { key: 'promotions', name: 'Promotions', weight: 20, icon: Tag, color: 'success' },
  { key: 'externalFactors', name: 'External Factors', weight: 12, icon: Calendar, color: 'warning' },
  { key: 'other', name: 'Other', weight: 8, icon: Lightbulb, color: 'muted' },
];

const AIInsights = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch<Product[]>('/data/products'),
    enabled: isAuthenticated,
  });

  const productId = selectedProduct || products?.[0]?.product_id || 'BL_KIT';

  const insightsMutation = useMutation({
    mutationFn: () =>
      apiFetch<InsightsResponse>('/insights/generate', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId }),
      }),
  });

  const insights = insightsMutation.data?.insights ?? [];
  const summary = insightsMutation.data?.executive_summary;
  const recommendations = insightsMutation.data?.recommendations ?? [];

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const question = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: 'user', content: question }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await apiFetch<{ response: string }>('/insights/chat', {
        method: 'POST',
        body: JSON.stringify({ message: question, selected_sku: productId }),
      });
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.response }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err instanceof Error ? err.message : t('insights:chat.error'),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader title={t('insights:header.title')} subtitle={t('insights:header.subtitle')} />

        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          {productId && (
            <AISummaryCard
              title={t('insights:summaryCard.title')}
              productId={productId}
              sourceType="insight"
              question={t('insights:summaryCard.question', { productId })}
            />
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <Select value={productId} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder={t('insights:product.select')} />
              </SelectTrigger>
              <SelectContent>
                {(products ?? []).map((p) => (
                  <SelectItem key={p.product_id} value={p.product_id}>
                    {p.product_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => insightsMutation.mutate()}
              disabled={insightsMutation.isPending}
            >
              {insightsMutation.isPending ? t('insights:actions.generating') : t('insights:actions.generate')}
            </Button>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">{t('insights:summary.title')}</h3>
                    <p className="text-xs sm:text-base text-muted-foreground leading-relaxed">
                      {summary || t('insights:summary.placeholder')}
                    </p>
                    {recommendations.length > 0 && (
                      <ul className="mt-3 list-disc list-inside text-xs sm:text-sm text-muted-foreground space-y-1">
                        {recommendations.map((rec) => (
                          <li key={rec}>{rec}</li>
                        ))}
                      </ul>
                    )}
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
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">{t('insights:factors.title')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {t('insights:factors.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4">
                  {defaultFactors.map((factor, index) => (
                    <motion.div
                      key={factor.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="text-center p-3 sm:p-4 rounded-xl border border-border hover:border-primary/30 transition-colors"
                    >
                      <div
                        className={cn(
                          'w-10 h-10 sm:w-12 sm:h-12 rounded-xl mx-auto mb-2 sm:mb-3 flex items-center justify-center',
                          `bg-${factor.color}/10`
                        )}
                      >
                        <factor.icon className={cn('w-5 h-5 sm:w-6 sm:h-6', `text-${factor.color}`)} />
                      </div>
                      <p className="text-lg sm:text-2xl font-bold gradient-text">{factor.weight}%</p>
                      <p className="text-[10px] sm:text-sm text-muted-foreground">{t(`insights:factors.${factor.key}`)}</p>
                    </motion.div>
                  ))}
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
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">{t('insights:insights.title')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {t('insights:insights.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {insights.length === 0 && !insightsMutation.isPending && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t('insights:insights.empty')}
                  </p>
                )}
                {insights.map((insight, index) => (
                  <motion.div
                    key={`${insight.title}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                    className="p-3 sm:p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div
                        className={cn(
                          'w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                          insight.direction === 'up'
                            ? 'bg-success/10'
                            : insight.direction === 'down'
                              ? 'bg-destructive/10'
                              : 'bg-muted'
                        )}
                      >
                        {insight.direction === 'up' ? (
                          <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                        ) : insight.direction === 'down' ? (
                          <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                        ) : (
                          <Minus className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 mb-1">
                          <h4 className="font-semibold text-sm sm:text-base">{insight.title}</h4>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={cn(
                                'inline-block px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-medium',
                                insight.impact === 'high'
                                  ? 'bg-destructive/10 text-destructive'
                                  : insight.impact === 'medium'
                                    ? 'bg-warning/10 text-warning'
                                    : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {insight.impact}
                            </span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground">
                              {insight.confidence}%
                            </span>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-border ml-11 sm:ml-14">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">{t('insights:insights.factorLabel')}</span>
                      <span className="px-2 py-0.5 text-[10px] sm:text-xs rounded-full bg-secondary text-secondary-foreground">
                        {insight.factor}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">{t('insights:chat.title')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {t('insights:chat.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col h-80 space-y-4">
                  <div className="flex-1 overflow-y-auto space-y-4 border rounded-md p-4 bg-muted/20">
                    {chatMessages.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center mt-10">
                        {t('insights:chat.placeholder')}
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                        >
                          {msg.role === 'user' ? (
                            msg.content
                          ) : (
                            <FormattedMessage content={msg.content} />
                          )}
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3 text-sm animate-pulse">{t('insights:chat.analyzing')}</div>
                      </div>
                    )}
                  </div>
                  <form onSubmit={handleChatSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={t('insights:chat.inputPlaceholder')}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                      disabled={isChatLoading}
                    />
                    <button
                      type="submit"
                      disabled={isChatLoading || !chatInput.trim()}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50"
                    >
                      {t('insights:chat.send')}
                    </button>
                  </form>
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

export default AIInsights;
