import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AIChatbot } from '@/components/chatbot/AIChatbot';
import { AISummaryCard } from '@/components/ai/AISummaryCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { useMLOps } from '@/components/mlops/data/useMlops';

import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Database,
  Cpu,
  Zap,
  Bot,
  BrainCircuit,
  Eye,
  ExternalLink,
  Loader2,
  Clock,
  Hash,
  AlertCircle,
  Gauge,
  Sparkles,
  Shield,
  CircleDot,
} from 'lucide-react';

import { cn } from '@/lib/utils';

/* ── Agent icon mapping ── */
const AGENT_ICONS: Record<string, typeof Bot> = {
  supervisor_agent: BrainCircuit,
  forecasting_agent: Activity,
  inventory_agent: Database,
  rag_agent: Eye,
  mlops_agent: Cpu,
  insights_agent: Sparkles,
  copilot_chat: Bot,
  rag_query: Eye,
  inventory_rag_query: Database,
  forecast_reasoning: Gauge,
  insights_analyze: Sparkles,
};

/* ── Status config ── */
const STATUS_CONFIG = {
  healthy: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/30',
    icon: CheckCircle2,
    dot: 'bg-success',
  },
  degraded: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive/30',
    icon: AlertTriangle,
    dot: 'bg-destructive',
  },
  idle: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
    icon: CircleDot,
    dot: 'bg-muted-foreground',
  },
} as const;

const MLOps = () => {
  const { t, i18n } = useTranslation();

  const {
    metrics,
    tracing,
    isLoading,
    retrainMutation,
  } = useMLOps();

  if (isLoading) {
    return <div className="p-8">{t('mlops:loading')}</div>;
  }

  if (!metrics) {
    return <div className="p-8">{t('mlops:noData')}</div>;
  }

  const langsmithUrl = `https://smith.langchain.com/o/8077c618-18ed-4827-bcfb-ec7d5516473c/projects/p/3f6b3cb0-c7ee-45b3-a428-9abeaa717b45?timeModel=%7B%22duration%22%3A%221d%22%7D`;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          title={t('mlops:title')}
          subtitle={t('mlops:subtitle')}
        />

        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          <AISummaryCard
            title={t('mlops:driftInvestigation')}
            sourceType="mlops"
            question={t('mlops:driftQuestion')}
          />

          {/* Status Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[
              { label: t('mlops:cards.modelStatus'), value: t('mlops:healthy'), icon: Activity, color: 'success' },
              { label: t('mlops:cards.lastRetrain'), value: metrics.status?.lastRetrained ? `${metrics.status.lastRetrained}` : t('mlops:noData'), icon: RefreshCw, color: 'primary' },
              { label: t('mlops:cards.dataPipeline'), value: metrics.status?.pipelineStatus === 'active' ? t('mlops:active') : t('mlops:inactive'), icon: Database, color: 'accent' },
              { label: t('mlops:cards.inference'), value: metrics.status?.inferenceLatency ?? '45ms', icon: Zap, color: 'warning' },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="pt-4 sm:pt-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={cn(
                        'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                        `bg-${item.color}/10`
                      )}>
                        <item.icon className={cn('w-5 h-5 sm:w-6 sm:h-6', `text-${item.color}`)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{item.label}</p>
                        <p className="text-base sm:text-xl font-bold truncate">{item.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              LangSmith AI Agent Tracing Dashboard
             ═══════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="border-primary/20 overflow-hidden relative">

              <CardHeader className="pb-3 sm:pb-5 relative">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BrainCircuit className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        {t('mlops:langsmith.title')}
                        {tracing?.enabled && (
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {t('mlops:langsmith.description')}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => window.open(langsmithUrl, '_blank')}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      {t('mlops:langsmith.viewInLangSmith')}
                    </Button>
                  </div>
                </div>

                {/* Summary stat bar */}
                {tracing && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-muted/40 rounded-xl p-3 text-center border border-border">
                      <p className="text-[10px] text-muted-foreground mb-0.5">{t('mlops:langsmith.tracingStatus')}</p>
                      <p className={cn('text-sm font-bold', tracing.enabled ? 'text-success' : 'text-destructive')}>
                        {tracing.enabled ? t('mlops:langsmith.enabled') : t('mlops:langsmith.disabled')}
                      </p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-3 text-center border border-border">
                      <p className="text-[10px] text-muted-foreground mb-0.5">{t('mlops:langsmith.project')}</p>
                      <p className="text-sm font-bold text-primary truncate">{tracing.project}</p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-3 text-center border border-border">
                      <p className="text-[10px] text-muted-foreground mb-0.5">{t('mlops:langsmith.totalCalls')}</p>
                      <p className="text-sm font-bold">
                        <span className="flex items-center justify-center gap-1">
                          <Hash className="w-3.5 h-3.5 text-primary" />
                          {tracing.total_calls}
                        </span>
                      </p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-3 text-center border border-border">
                      <p className="text-[10px] text-muted-foreground mb-0.5">{t('mlops:langsmith.errorsToday')}</p>
                      <p className={cn(
                        'text-sm font-bold',
                        tracing.errors_last_24h > 0 ? 'text-destructive' : 'text-success'
                      )}>
                        <span className="flex items-center justify-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {tracing.errors_last_24h}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="relative">
                {!tracing || tracing.agents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                      <Bot className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-xs text-center">
                      {tracing?.error
                        ? t('mlops:langsmith.fetchError')
                        : t('mlops:langsmith.noAgents')}
                    </p>
                    {tracing && !tracing.api_key_configured && (
                      <Badge variant="outline" className="text-warning border-warning/40">
                        {t('mlops:langsmith.notConfigured')}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tracing.agents.map((agent, index) => {
                      const status = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.idle;
                      const StatusIcon = status.icon;
                      const AgentIcon = AGENT_ICONS[agent.name] ?? Bot;

                      return (
                        <motion.div
                          key={agent.name}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.05 + index * 0.05 }}
                          className={cn(
                            'rounded-xl border bg-card p-4 sm:p-5 transition-all duration-200',
                            'hover:border-primary/30',
                            status.border
                          )}
                        >
                          {/* Top row: icon + name + status */}
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                              status.bg
                            )}>
                              <AgentIcon className={cn('w-5 h-5', status.text)} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3 mb-2">
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-sm sm:text-base truncate">
                                    {agent.label}
                                  </h4>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">
                                    {t('mlops:langsmith.model')}: {agent.model}
                                  </p>
                                </div>

                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] sm:text-xs flex items-center gap-1 flex-shrink-0 w-fit',
                                    status.text,
                                    status.border
                                  )}
                                >
                                  <StatusIcon className="w-3 h-3" />
                                  {t(`mlops:langsmith.status${agent.status.charAt(0).toUpperCase()}${agent.status.slice(1)}`)}
                                </Badge>
                              </div>

                              {/* Metrics row */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3">
                                <div className="bg-muted/30 rounded-lg px-3 py-2">
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Hash className="w-3 h-3" />
                                    {t('mlops:langsmith.calls')}
                                  </p>
                                  <p className="text-sm font-bold mt-0.5">{agent.calls_last_24h}</p>
                                </div>

                                <div className="bg-muted/30 rounded-lg px-3 py-2">
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {t('mlops:langsmith.errors')}
                                  </p>
                                  <p className={cn(
                                    'text-sm font-bold mt-0.5',
                                    agent.errors_last_24h > 0 ? 'text-destructive' : 'text-success'
                                  )}>
                                    {agent.errors_last_24h}
                                  </p>
                                </div>

                                <div className="bg-muted/30 rounded-lg px-3 py-2">
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Gauge className="w-3 h-3" />
                                    {t('mlops:langsmith.avgLatency')}
                                  </p>
                                  <p className="text-sm font-bold mt-0.5">
                                    {agent.avg_latency_seconds != null
                                      ? t('mlops:langsmith.seconds', { value: agent.avg_latency_seconds.toFixed(2) })
                                      : t('mlops:langsmith.noLatency')}
                                  </p>
                                </div>

                                <div className="bg-muted/30 rounded-lg px-3 py-2">
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {t('mlops:langsmith.lastSeen')}
                                  </p>
                                  <p className="text-xs font-medium mt-0.5 truncate">
                                    {agent.last_seen
                                      ? new Date(agent.last_seen).toLocaleString(i18n.language, {
                                          dateStyle: 'short',
                                          timeStyle: 'short',
                                        })
                                      : t('mlops:langsmith.noLatency')}
                                  </p>
                                </div>
                              </div>

                              {/* Error rate bar (only if calls > 0) */}
                              {agent.calls_last_24h > 0 && (
                                <div className="mt-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <Shield className="w-3 h-3" />
                                      Success Rate
                                    </span>
                                    <span className={cn(
                                      'text-[10px] font-bold',
                                      agent.errors_last_24h === 0 ? 'text-success' : 'text-warning'
                                    )}>
                                      {Math.round(((agent.calls_last_24h - agent.errors_last_24h) / agent.calls_last_24h) * 100)}%
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{
                                        width: `${Math.round(((agent.calls_last_24h - agent.errors_last_24h) / agent.calls_last_24h) * 100)}%`,
                                      }}
                                      transition={{ duration: 0.8, delay: 0.2 + index * 0.05 }}
                                      className={cn(
                                        'h-full rounded-full',
                                        agent.errors_last_24h === 0 ? 'bg-success' : 'bg-warning'
                                      )}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Model Performance Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">{t('mlops:chart.accuracyTitle')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{t('mlops:chart.accuracyDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-52 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.modelAccuracy}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[88, 96]}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        width={35}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="accuracy"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
                        name={t('mlops:chart.accuracySeriesName')}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
            {/* Data Drift */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-base sm:text-lg">{t('mlops:drift.title')}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{t('mlops:drift.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  {metrics.dataDrift.map((item, index) => (

                    <motion.div
                      key={item.feature}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                      className="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-border"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className={cn(
                          'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          item.status === 'healthy' ? 'bg-success/10' : 'bg-warning/10'
                        )}>
                          {item.status === 'healthy' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-warning" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">{item.feature}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{t('mlops:drift.driftLabel', { value: item.drift })}</p>
                        </div>
                      </div>
                      <Badge
                        variant={item.status === 'healthy' ? 'outline' : 'secondary'}
                        className={cn(
                          'text-xs flex-shrink-0',
                          item.status === 'healthy' ? 'border-success/50 text-success' : 'border-warning/50 text-warning'
                        )}
                      >
                        {t(item.status === 'healthy' ? 'mlops:drift.statusHealthy' : 'mlops:drift.statusWarning')}
                      </Badge>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Retraining History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-base sm:text-lg">{t('mlops:retraining.title')}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{t('mlops:retraining.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  {metrics.retrainingHistory.map((item, index) => (

                    <motion.div
                      key={item.date}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                      className="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-border"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">{item.date}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('mlops:retraining.triggerLabel', { trigger: item.trigger })}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge variant="outline" className="border-success/50 text-success text-xs mb-0.5">
                        {t(item.status === 'healthy' ? 'mlops:drift.statusHealthy' : 'mlops:drift.statusWarning')}
                        </Badge>
                        <p className="text-[10px] sm:text-xs text-success font-medium">{item.improvement}</p>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* System Resources */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">{t('mlops:resources.title')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{t('mlops:resources.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  {[
                    { label: t('mlops:resources.cpu'), value: metrics.system.cpu },
                    { label: t('mlops:resources.memory'), value: metrics.system.memory },
                    { label: t('mlops:resources.gpu'), value: metrics.system.gpu },

                  ].map((resource) => (
                    <div key={resource.label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-muted-foreground">{resource.label}</span>
                        <span className="text-xs sm:text-sm font-medium">{resource.value}%</span>
                      </div>
                      <Progress value={resource.value} className="h-1.5 sm:h-2" />
                    </div>
                  ))}
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

export default MLOps;
