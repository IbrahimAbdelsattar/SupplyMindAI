import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AIChatbot } from '@/components/chatbot/AIChatbot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, Ban, Activity, Bug, Lock, FileWarning } from 'lucide-react';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type ViolationItem = {
  id: string;
  timestamp: string;
  category: string;
  severity: string;
  user_id: string | null;
  input_preview: string | null;
  blocked: boolean;
};

type StatsResponse = {
  total_violations: number;
  total_blocked: number;
  violations_by_category: Record<string, number>;
  violations_by_severity: Record<string, number>;
  recent_violations: ViolationItem[];
};

const SEVERITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

const CATEGORY_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#e11d48', '#be123c',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6b7280',
];

function SummaryCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-card p-4 sm:p-5 flex items-center gap-4 transition-all duration-300 hover:border-primary/30"
    >
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
        <p className="text-xl sm:text-2xl font-bold mt-0.5">{value}</p>
      </div>
    </motion.div>
  );
}

const Security = () => {
  const { t } = useTranslation();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['security-stats'],
    queryFn: () => apiFetch<StatsResponse>('/security/stats'),
    refetchInterval: 30000,
  });

  const categoryData = stats?.violations_by_category
    ? Object.entries(stats.violations_by_category).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value,
      }))
    : [];

  const severityData = stats?.violations_by_severity
    ? Object.entries(stats.violations_by_severity).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          title={t('common:nav.security', 'Security')}
          subtitle="Guardrail monitoring and violation tracking"
        />

        <main className="flex-1 p-3 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <SummaryCard
              icon={AlertTriangle}
              label="Total Violations"
              value={stats?.total_violations ?? 0}
              color="bg-destructive"
            />
            <SummaryCard
              icon={Ban}
              label="Blocked"
              value={stats?.total_blocked ?? 0}
              color="bg-orange-500"
            />
            <SummaryCard
              icon={Shield}
              label="Categories"
              value={categoryData.length}
              color="bg-primary"
            />
            <SummaryCard
              icon={Bug}
              label="Severity Levels"
              value={severityData.length}
              color="bg-purple-500"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Violations by category */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <FileWarning className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">Violations by Category</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Distribution of guardrail violations by detection category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {categoryData.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                      {isLoading ? 'Loading...' : 'No violation data available'}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={categoryData} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          angle={-25}
                          textAnchor="end"
                          height={80}
                          interval={0}
                        />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-card, hsl(240 10% 3.9%))',
                            border: '1px solid var(--color-border, hsl(240 5.9% 90%))',
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          cursor={{ fill: 'var(--color-muted, hsl(240 4.8% 95.9%))', opacity: 0.3 }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {categoryData.map((_, i) => (
                            <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Severity distribution */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">Severity Distribution</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Breakdown of violations by severity level
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {severityData.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                      {isLoading ? 'Loading...' : 'No severity data available'}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={severityData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={{ strokeWidth: 1 }}
                        >
                          {severityData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={SEVERITY_COLORS[entry.name.toLowerCase()] ?? '#6b7280'}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-card)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          iconType="circle"
                          iconSize={10}
                          formatter={(value) => (
                            <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>
                              {value}
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recent violations table */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Recent Violations</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Latest guardrail violations across all categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    Loading violations...
                  </div>
                ) : !stats?.recent_violations?.length ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <Shield className="w-10 h-10 text-success/60" />
                    <p className="text-sm text-muted-foreground">No violations recorded yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Category</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden sm:table-cell">Input</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground">Severity</th>
                          <th className="text-left py-2 px-2 font-medium text-muted-foreground hidden md:table-cell">Time</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">Blocked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recent_violations.map((v) => (
                          <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-2 capitalize">
                              <span className="inline-flex items-center gap-1.5">
                                {v.category.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-muted-foreground max-w-[200px] truncate hidden sm:table-cell">
                              {v.input_preview ?? '—'}
                            </td>
                            <td className="py-2.5 px-2">
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize',
                                  v.severity === 'critical' && 'bg-destructive/15 text-destructive',
                                  v.severity === 'high' && 'bg-orange-500/15 text-orange-500',
                                  v.severity === 'medium' && 'bg-warning/15 text-warning',
                                  v.severity === 'low' && 'bg-success/15 text-success',
                                )}
                              >
                                {v.severity}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-muted-foreground hidden md:table-cell">
                              {new Date(v.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
                                  v.blocked
                                    ? 'bg-destructive/15 text-destructive'
                                    : 'bg-success/15 text-success',
                                )}
                              >
                                {v.blocked ? 'Yes' : 'No'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>

      <AIChatbot />
    </div>
  );
};

export default Security;
