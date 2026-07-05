import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
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
import {
  Brain,
  TrendingUp,
  Calendar,
  Sun,
  Tag,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertTriangle,
  Shield,
  Zap,
  Target,
  BarChart3,
  Send,
  Bot,
  User,
  Loader2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { consumeSSE } from '@/lib/stream';
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


/* ── Single Key Insight Card ── */
function InsightCard({
  insight,
  index,
}: {
  insight: InsightItem;
  index: number;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const isUp = insight.direction === 'up';
  const isDown = insight.direction === 'down';
  const isHigh = insight.impact === 'high';
  const isMedium = insight.impact === 'medium';

  const impactConfig = {
    high: {
      label: 'High',
      bg: 'bg-destructive/10',
      text: 'text-destructive',
      border: 'border-destructive/20',
      icon: AlertTriangle,
    },
    medium: {
      label: 'Medium',
      bg: 'bg-warning/10',
      text: 'text-warning',
      border: 'border-warning/20',
      icon: Zap,
    },
    low: {
      label: 'Low',
      bg: 'bg-muted',
      text: 'text-muted-foreground',
      border: 'border-border',
      icon: Shield,
    },
  } as const;

  const impact = impactConfig[insight.impact as keyof typeof impactConfig] ?? impactConfig.low;
  const ImpactIcon = impact.icon;

  const directionConfig = isUp
    ? { bg: 'bg-success/10', text: 'text-success', Icon: ArrowUp }
    : isDown
    ? { bg: 'bg-destructive/10', text: 'text-destructive', Icon: ArrowDown }
    : { bg: 'bg-muted', text: 'text-muted-foreground', Icon: Minus };

  const DirIcon = directionConfig.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 + index * 0.08 }}
      className={cn(
        'rounded-2xl border bg-card overflow-hidden transition-all duration-300',
        'hover:border-primary/30',
        isHigh ? 'border-destructive/20' : isMedium ? 'border-warning/15' : 'border-border'
      )}
    >
      {/* Coloured top accent bar */}
      <div
        className={cn(
          'h-1 w-full',
          isHigh ? 'bg-destructive' : isMedium ? 'bg-warning' : 'bg-muted-foreground/30'
        )}
      />

      <div className="p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Direction badge */}
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              directionConfig.bg
            )}
          >
            <DirIcon className={cn('w-5 h-5', directionConfig.text)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
              <h4 className="font-semibold text-sm sm:text-base leading-snug">{insight.title}</h4>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-semibold border',
                    impact.bg,
                    impact.text,
                    impact.border
                  )}
                >
                  <ImpactIcon className="w-3 h-3" />
                  {insight.impact.charAt(0).toUpperCase() + insight.impact.slice(1)} Impact
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {insight.description}
            </p>
          </div>
        </div>

        {/* Confidence + factor row */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border">
          {/* Confidence bar */}
          <div className="flex-1 max-w-[220px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Target className="w-3 h-3" />
                {t('insights:insights.confidence', 'Confidence')}
              </span>
              <span
                className={cn(
                  'text-[10px] font-bold',
                  insight.confidence >= 80
                    ? 'text-success'
                    : insight.confidence >= 60
                    ? 'text-warning'
                    : 'text-destructive'
                )}
              >
                {insight.confidence}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${insight.confidence}%` }}
                transition={{ duration: 0.8, delay: 0.3 + index * 0.08 }}
                className={cn(
                  'h-full rounded-full',
                  insight.confidence >= 80
                    ? 'bg-success'
                    : insight.confidence >= 60
                    ? 'bg-warning'
                    : 'bg-destructive'
                )}
              />
            </div>
          </div>

          {/* Factor chip + expand */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{t('insights:insights.factorLabel')}</span>
            <span className="px-2.5 py-1 text-[10px] sm:text-xs rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
              {insight.factor}
            </span>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="ml-1 p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expanded detail panel */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-dashed border-border">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Direction</p>
                    <p
                      className={cn(
                        'text-xs font-semibold capitalize',
                        isUp ? 'text-success' : isDown ? 'text-destructive' : 'text-muted-foreground'
                      )}
                    >
                      {insight.direction}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Impact Level</p>
                    <p className={cn('text-xs font-semibold capitalize', impact.text)}>
                      {insight.impact}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Confidence</p>
                    <p
                      className={cn(
                        'text-xs font-semibold',
                        insight.confidence >= 80
                          ? 'text-success'
                          : insight.confidence >= 60
                          ? 'text-warning'
                          : 'text-destructive'
                      )}
                    >
                      {insight.confidence}%
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {insight.description}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════
   Main Page
════════════════════════════════════════════════ */
const AIInsights = () => {
  const { t } = useTranslation();
  const [selectedProduct, setSelectedProduct] = useState('');

  /* ── Streaming state ── */
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [streamTokens, setStreamTokens] = useState('');
  const [streamResult, setStreamResult] = useState<InsightsResponse | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch<Product[]>('/data/products'),
  });

  const productId = selectedProduct || products?.[0]?.product_id || 'BL_KIT';

  const generateInsights = useCallback(() => {
    setStreamStatus(null);
    setStreamTokens('');
    setStreamResult(null);
    setStreamError(null);
    setElapsedMs(null);
    setIsStreaming(true);

    consumeSSE<InsightsResponse>('/insights/generate/stream', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
      callbacks: {
        onStart: () => setStreamStatus('Starting generation…'),
        onStatus: (msg) => setStreamStatus(msg),
        onToken: (tok) => setStreamTokens((prev) => prev + tok),
        onResult: (res) => setStreamResult(res),
        onError: (msg) => setStreamError(msg),
        onDone: (meta) => {
          setIsStreaming(false);
          setElapsedMs(meta?.elapsed_ms ?? null);
        },
      },
    });
  }, [productId]);

  const insights = streamResult?.insights ?? [];
  const summary = streamResult?.executive_summary;
  const recommendations = streamResult?.recommendations ?? [];

  /* ─── Insight summary stats ─── */
  const highCount = insights.filter((i) => i.impact === 'high').length;
  const mediumCount = insights.filter((i) => i.impact === 'medium').length;
  const lowCount = insights.filter((i) => i.impact === 'low').length;
  const avgConfidence =
    insights.length > 0
      ? Math.round(insights.reduce((a, b) => a + b.confidence, 0) / insights.length)
      : 0;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader title={t('insights:title')} subtitle={t('insights:subtitle')} />

        <main className="flex-1 p-3 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto">
          {/* ── Cached AI Summary Card ── */}
          {productId && (
            <AISummaryCard
              title={t('insights:summaryCard.title')}
              productId={productId}
              sourceType="insight"
              question={t('insights:summaryCard.question', { productId })}
            />
          )}

          {/* ── Product selector + generate button ── */}
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
              onClick={generateInsights}
              disabled={isStreaming}
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isStreaming ? t('insights:actions.generating') : t('insights:actions.generate')}
            </Button>
          </div>

          {/* ── Executive Summary ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Card className="border-primary/30 bg-primary/[0.02] overflow-hidden relative">
              <CardContent className="pt-5 sm:pt-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold mb-2">{t('insights:summary.title')}</h3>

                    {/* Streaming status indicator */}
                    {isStreaming && (
                      <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        <span className="text-xs text-primary font-medium">{streamStatus}</span>
                      </div>
                    )}

                    {/* Streaming token display */}
                    {isStreaming && streamTokens && (
                      <div className="mb-3 p-3 rounded-lg bg-muted/50 border border-border max-h-32 overflow-y-auto">
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{streamTokens}</p>
                      </div>
                    )}

                    {/* Error display */}
                    {streamError && (
                      <div className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-xs text-destructive">{streamError}</p>
                      </div>
                    )}

                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {summary || t('insights:summary.placeholder')}
                    </p>

                    {/* Elapsed time badge */}
                    {elapsedMs != null && (
                      <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded-full">
                        {(elapsedMs / 1000).toFixed(1)}s
                      </span>
                    )}

                    {/* Recommendations grid */}
                    {recommendations.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {recommendations.map((rec, i) => (
                          <motion.div
                            key={rec}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + i * 0.06 }}
                            className="flex items-start gap-2 bg-primary/5 rounded-lg px-3 py-2 border border-primary/10"
                          >
                            <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <p className="text-xs text-muted-foreground leading-relaxed">{rec}</p>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>


          {/* ── Key Insights (power section) ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      <CardTitle className="text-base sm:text-lg">{t('insights:insights.title')}</CardTitle>
                    </div>
                    <CardDescription className="text-xs sm:text-sm">
                      {t('insights:insights.description')}
                    </CardDescription>
                  </div>

                  {/* Stats bar — visible when there are insights */}
                  {insights.length > 0 && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {highCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                          <AlertTriangle className="w-3 h-3" />
                          {highCount} High
                        </span>
                      )}
                      {mediumCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
                          <Zap className="w-3 h-3" />
                          {mediumCount} Med
                        </span>
                      )}
                      {lowCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          <Shield className="w-3 h-3" />
                          {lowCount} Low
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                        <Target className="w-3 h-3" />
                        {avgConfidence}% avg
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3 sm:space-y-4">
                {insights.length === 0 && !isStreaming && (
                  <div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                      <Lightbulb className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">No insights generated yet</p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        {t('insights:insights.empty')}
                      </p>
                    </div>
                  </div>
                )}

                {isStreaming && !streamResult && (
                  <div className="flex flex-col items-center justify-center py-14 gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
                      <Brain className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">{t('insights:actions.generating')}</p>
                    {streamStatus && (
                      <p className="text-xs text-primary">{streamStatus}</p>
                    )}
                  </div>
                )}

                {insights.map((insight, index) => (
                  <InsightCard key={`${insight.title}-${index}`} insight={insight} index={index} />
                ))}
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
