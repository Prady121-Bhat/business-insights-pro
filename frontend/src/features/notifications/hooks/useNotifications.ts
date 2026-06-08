import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/axios';

const KEYS = {
  list: (p: object) => ['notifications', p],
  count: ['notifications', 'unread-count'],
};

export const useNotifications = (params?: { page?: number; limit?: number; type?: string; severity?: string; unread?: boolean }) =>
  useQuery({
    queryKey: KEYS.list(params ?? {}),
    queryFn: () => api.get('/notifications', { params }).then((r) => r.data),
    staleTime: 30 * 1000,
  });

export const useUnreadCount = () =>
  useQuery({
    queryKey: KEYS.count,
    queryFn: () => api.get('/notifications/unread-count').then((r) => r.data.data.count as number),
    staleTime: 0,
    refetchInterval: 60 * 1000,
  });

export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.patch('/notifications/read', { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useDeleteNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useClearRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/notifications/clear-read'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};
