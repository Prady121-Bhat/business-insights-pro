import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/axios';

const STALE = 5 * 60 * 1000;

export const useSales = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['sales', params],
    queryFn: () => api.get('/sales', { params }).then((r) => r.data),
    staleTime: STALE,
  });

export const useSaleById = (id: string) =>
  useQuery({
    queryKey: ['sales', id],
    queryFn: () => api.get(`/sales/${id}`).then((r) => r.data.data),
    enabled: !!id,
    staleTime: STALE,
  });

export const useSaleStats = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['sales', 'stats', params],
    queryFn: () => api.get('/sales/stats', { params }).then((r) => r.data.data),
    staleTime: STALE,
  });

export const useCreateSale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/sales', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales'] }),
  });
};

export const useUpdateSale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/sales/${id}`, data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales'] }),
  });
};

export const useDeleteSale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/sales/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales'] }),
  });
};
