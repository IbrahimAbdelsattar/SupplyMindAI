import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';

export interface NotificationItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  product_id: string | null;
  created_at: string;
  read: boolean;
  read_at: string | null;
}

export function useNotifications() {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery<{ notifications: NotificationItem[]; total: number }>({
    queryKey: ['notifications'],
    queryFn: () => fetchApi('/notifications'),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const unreadQuery = useQuery<{ count: number }>({
    queryKey: ['notifications-unread'],
    queryFn: () => fetchApi('/notifications/unread-count'),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => fetchApi('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  return {
    notifications: notificationsQuery.data?.notifications ?? [],
    total: notificationsQuery.data?.total ?? 0,
    unreadCount: unreadQuery.data?.count ?? 0,
    isLoading: notificationsQuery.isLoading,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
  };
}
