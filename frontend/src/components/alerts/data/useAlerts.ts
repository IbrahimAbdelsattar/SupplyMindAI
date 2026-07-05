import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useMemo, useCallback } from 'react';
import type { AlertItem, AlertsResponse, SeverityCounts } from './types';

export function useAlerts() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<AlertsResponse>({
    queryKey: ['alerts'],
    queryFn: () => apiFetch<AlertsResponse>('/system/alerts/active'),
    refetchInterval: 30000,
  });

  const alerts = useMemo(() => data?.alerts ?? [], [data]);

  const severityCounts = useMemo<SeverityCounts>(() => {
    const counts: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const a of alerts) {
      if (a.severity in counts) counts[a.severity as keyof SeverityCounts]++;
    }
    return counts;
  }, [alerts]);

  const byType = useMemo(() => {
    const map: Record<string, AlertItem[]> = {};
    for (const a of alerts) {
      if (!map[a.type]) map[a.type] = [];
      map[a.type].push(a);
    }
    return map;
  }, [alerts]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
  }, [queryClient]);

  // ── Acknowledge mutation ──
  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) =>
      apiFetch(`/system/alerts/${alertId}/acknowledge`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // ── Dismiss mutation ──
  const dismissMutation = useMutation({
    mutationFn: (alertId: string) =>
      apiFetch(`/system/alerts/${alertId}/dismiss`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const acknowledge = useCallback(
    (alertId: string) => acknowledgeMutation.mutate(alertId),
    [acknowledgeMutation],
  );

  const dismiss = useCallback(
    (alertId: string) => dismissMutation.mutate(alertId),
    [dismissMutation],
  );

  return {
    alerts,
    total: data?.total ?? alerts.length,
    severityCounts,
    byType,
    isLoading,
    error,
    refresh,
    refetch,
    acknowledge,
    dismiss,
    isAcknowledging: acknowledgeMutation.isPending,
    isDismissing: dismissMutation.isPending,
  };
}
