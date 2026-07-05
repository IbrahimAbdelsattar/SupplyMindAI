// ── AI Command Center — Core Type Definitions ──

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type RecommendationPriority = 'urgent' | 'high' | 'medium' | 'low';
export type MetricStatus = 'healthy' | 'warning' | 'critical' | 'neutral';
export type InsightCategory = 'opportunity' | 'risk' | 'optimization' | 'trend' | 'anomaly';

export interface CriticalAlert {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  severity: Severity;
  status: AlertStatus;
  metric?: string;
  currentValue?: string;
  threshold?: string;
  triggeredAt: string;
  affectedProducts?: string[];
  source: string;
  sourceAr: string;
  actionLabel?: string;
  actionLabelAr?: string;
}

export interface Recommendation {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  priority: RecommendationPriority;
  category: string;
  categoryAr: string;
  impact: string;
  impactAr: string;
  confidence: number;
  estimatedSavings?: string;
  estimatedSavingsAr?: string;
  actionLabel: string;
  actionLabelAr?: string;
  relatedAlertId?: string;
}

export interface HealthMetric {
  id: string;
  label: string;
  labelAr: string;
  value: number;
  unit: string;
  unitAr: string;
  target?: number;
  trend: 'up' | 'down' | 'flat';
  trendValue: string;
  status: MetricStatus;
  sparkData?: number[];
}

export interface MorningBriefData {
  date: string;
  greeting: string;
  greetingAr: string;
  executiveSummary: string;
  executiveSummaryAr: string;
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
  topPriority: string;
  topPriorityAr: string;
  forecastAccuracy: number;
  inventoryHealth: number;
  supplyChainStatus: MetricStatus;
}

export interface InsightItem {
  id: string;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  category: InsightCategory;
  confidence: number;
  timestamp: string;
  source: string;
  sourceAr: string;
  actionable: boolean;
  actionLabel?: string;
  actionLabelAr?: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  timestamp: string;
  type: 'alert' | 'action' | 'insight' | 'system' | 'forecast';
  severity?: Severity;
  completed?: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  category: 'forecast' | 'inventory' | 'report' | 'system';
  lastRun?: string;
  status?: 'idle' | 'running' | 'success' | 'error';
}

export interface SupplyChainNode {
  id: string;
  label: string;
  labelAr: string;
  type: 'warehouse' | 'supplier' | 'distribution' | 'store' | 'manufacturing';
  status: MetricStatus;
  x: number;
  y: number;
  connections: string[];
  metric?: string;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
}


