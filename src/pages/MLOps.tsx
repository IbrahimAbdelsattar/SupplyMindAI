import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AIChatbot } from '@/components/chatbot/AIChatbot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { mlopsMetrics } from '@/lib/mockData';
import { Activity, CheckCircle2, AlertTriangle, RefreshCw, Database, Cpu, Zap } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const MLOps = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader 
          title="MLOps & Monitoring" 
          subtitle="Model performance and data pipeline health" 
        />

        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          {/* Status Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[
              { label: 'Model Status', value: 'Healthy', icon: Activity, color: 'success' },
              { label: 'Last Retrain', value: '2 days ago', icon: RefreshCw, color: 'primary' },
              { label: 'Data Pipeline', value: 'Active', icon: Database, color: 'accent' },
              { label: 'Inference', value: '45ms', icon: Zap, color: 'warning' },
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

          {/* Model Performance Chart */}
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
                <div className="h-52 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mlopsMetrics.modelAccuracy}>
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
                        name="Accuracy %"
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
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-base sm:text-lg">Data Drift Monitoring</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Feature distribution stability</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  {mlopsMetrics.dataDrift.map((item, index) => (
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
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Drift: {item.drift}</p>
                        </div>
                      </div>
                      <Badge
                        variant={item.status === 'healthy' ? 'outline' : 'secondary'}
                        className={cn(
                          'text-xs flex-shrink-0',
                          item.status === 'healthy' ? 'border-success/50 text-success' : 'border-warning/50 text-warning'
                        )}
                      >
                        {item.status}
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
                  <CardTitle className="text-base sm:text-lg">Retraining History</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Recent model updates and triggers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  {mlopsMetrics.retrainingHistory.map((item, index) => (
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
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Trigger: {item.trigger}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge variant="outline" className="border-success/50 text-success text-xs mb-0.5">
                          {item.status}
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
                <CardTitle className="text-base sm:text-lg">System Resources</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Infrastructure utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  {[
                    { label: 'CPU Usage', value: 42 },
                    { label: 'Memory Usage', value: 68 },
                    { label: 'GPU Utilization', value: 35 },
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
