import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type {
  MorningBriefData,
  CriticalAlert,
  Recommendation,
  HealthMetric,
  TimelineEvent,
  SupplyChainNode,
} from './types';

const COMMAND_CENTER_QUERY_KEY = ['command-center', 'dashboard'];

interface CommandCenterAPIResponse {
  morningBrief: MorningBriefData;
  alerts: CriticalAlert[];
  recommendations: Recommendation[];
  healthMetrics: HealthMetric[];
  timeline: TimelineEvent[];
  supplyChainNodes: SupplyChainNode[];
}

export function useCommandCenter() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<CommandCenterAPIResponse>({
    queryKey: COMMAND_CENTER_QUERY_KEY,
    queryFn: () => apiFetch<CommandCenterAPIResponse>('/command-center/dashboard'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const acknowledgeAlert = useCallback(
    (alertId: string) => {
      queryClient.setQueryData<CommandCenterAPIResponse>(
        COMMAND_CENTER_QUERY_KEY,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            alerts: old.alerts.map((a) =>
              a.id === alertId ? { ...a, status: 'acknowledged' as const } : a
            ),
          };
        }
      );
    },
    [queryClient]
  );

  const dismissAlert = useCallback(
    (alertId: string) => {
      queryClient.setQueryData<CommandCenterAPIResponse>(
        COMMAND_CENTER_QUERY_KEY,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            alerts: old.alerts.filter((a) => a.id !== alertId),
          };
        }
      );
    },
    [queryClient]
  );


  return {
    morningBrief: data?.morningBrief ?? {
      date: new Date().toISOString(),
      greeting: 'Good morning',
      greetingAr: 'صباح الخير',
      executiveSummary: 'Loading...',
      executiveSummaryAr: 'جاري التحميل...',
      criticalCount: 0,
      warningCount: 0,
      healthyCount: 0,
      topPriority: 'Loading...',
      topPriorityAr: 'جاري التحميل...',
      forecastAccuracy: 0,
      inventoryHealth: 0,
      supplyChainStatus: 'healthy' as const,
    },
    alerts: data?.alerts ?? [],
    recommendations: data?.recommendations ?? [],
    healthMetrics: data?.healthMetrics ?? [],
    timeline: data?.timeline ?? [],
    supplyChainNodes: data?.supplyChainNodes ?? [],
    isLoading,
    error: error?.message ?? null,
    acknowledgeAlert,
    dismissAlert,
  };
}
