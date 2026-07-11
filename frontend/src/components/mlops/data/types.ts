/* ── MLOps data types ── */

export type AccuracyPoint = {
  date: string;
  accuracy: number;
};

export type DriftMetric = {
  feature: string;
  status: 'healthy' | 'warning' | 'critical';
  drift: number;
  p_value?: number;
  test?: string;
};

export type RetrainingEvent = {
  date: string;
  trigger: string;
  status: string;
  improvement: string;
};

export type SystemMetrics = {
  cpu: number;
  memory: number;
  gpu: number;
};

export type StatusData = {
  modelStatus: 'healthy' | 'degraded' | 'critical';
  lastRetrained: string | null;
  pipelineStatus: 'active' | 'inactive';
  inferenceLatency: string;
};

export type MLOpsMetrics = {
  modelAccuracy: AccuracyPoint[];
  dataDrift: DriftMetric[];
  retrainingHistory: RetrainingEvent[];
  system: SystemMetrics;
  status: StatusData;
};

export type TracingAgent = {
  name: string;
  label: string;
  model: string;
  status: 'healthy' | 'degraded' | 'idle';
  calls_last_24h: number;
  errors_last_24h: number;
  avg_latency_seconds: number | null;
  first_seen: string | null;
  last_seen: string | null;
};

export type TracingData = {
  enabled: boolean;
  project: string;
  api_key_configured: boolean;
  project_url?: string;
  agents: TracingAgent[];
  total_calls: number;
  errors_last_24h: number;
  error?: string;
};
