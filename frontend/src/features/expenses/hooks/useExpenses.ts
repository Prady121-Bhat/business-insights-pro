import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/axios';

const STALE = 5 * 60 * 1000;

export const useExpenses = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['expenses', params],
    queryFn: () => api.get('/expenses', { params }).then((r) => r.data),
    staleTime: STALE,
  });

export const useExpenseStats = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['expenses', 'stats', params],
    queryFn: () => api.get('/expenses/stats', { params }).then((r) => r.data.data),
    staleTime: STALE,
  });

export const useCreateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/expenses', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
};

export const useUpdateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/expenses/${id}`, data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
};

export const useDeleteExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
};
