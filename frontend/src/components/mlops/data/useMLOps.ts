import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { MLOpsMetrics, TracingData } from './types';

export function useMLOps() {
  const queryClient = useQueryClient();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['mlops-metrics'],
    queryFn: () => apiFetch<MLOpsMetrics>('/mlops/metrics'),
  });

  const { data: tracing, isLoading: tracingLoading } = useQuery({
    queryKey: ['mlops-tracing'],
    queryFn: () => apiFetch<TracingData>('/mlops/langsmith'),
  });

  const retrainMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ status: string; message: string }>('/mlops/train', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mlops-metrics'] });
    },
  });

  const isLoading = metricsLoading || tracingLoading;

  const status = metrics?.status;
  const latestAccuracy = metrics?.modelAccuracy?.[metrics.modelAccuracy.length - 1];
  const latestRetrain = metrics?.retrainingHistory?.[0];

  const modelHealth =
    status?.modelStatus === 'healthy'
      ? 'Healthy'
      : status?.modelStatus === 'degraded'
        ? 'Degraded'
        : status?.modelStatus === 'critical'
          ? 'Critical'
          : 'Unknown';

  const pipelineHealth =
    status?.pipelineStatus === 'active' ? 'Active' : 'Inactive';

  const avgLatency = status?.inferenceLatency ?? '—';

  return {
    metrics,
    tracing,
    isLoading,
    metricsLoading,
    tracingLoading,
    retrainMutation,
    status,
    latestAccuracy,
    latestRetrain,
    modelHealth,
    pipelineHealth,
    avgLatency,
  };
}
