import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/axios';

const STALE = 5 * 60 * 1000;

export const useInsights = (params?: { category?: string; severity?: string }) =>
  useQuery({
    queryKey: ['insights', params],
    queryFn: () => api.get('/insights', { params }).then((r) => r.data),
    staleTime: STALE,
  });

export const useInsightsSummary = () =>
  useQuery({
    queryKey: ['insights', 'summary'],
    queryFn: () => api.get('/insights/summary').then((r) => r.data.data),
    staleTime: STALE,
  });

export const useRefreshInsights = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/insights/refresh').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insights'] }),
  });
};

export const useNotificationHistory = (params?: { page?: number; unreadOnly?: boolean }) =>
  useQuery({
    queryKey: ['insights', 'notifications', params],
    queryFn: () => api.get('/insights/notifications', { params }).then((r) => r.data),
    staleTime: 60 * 1000,
  });

export const useUnreadCount = () =>
  useQuery({
    queryKey: ['insights', 'unread-count'],
    queryFn: () => api.get('/insights/notifications/unread-count').then((r) => r.data.data.count),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.patch('/insights/notifications/read', { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insights', 'notifications'] });
      qc.invalidateQueries({ queryKey: ['insights', 'unread-count'] });
    },
  });
};

export const useMarkAllRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/insights/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insights', 'notifications'] });
      qc.invalidateQueries({ queryKey: ['insights', 'unread-count'] });
    },
  });
};
