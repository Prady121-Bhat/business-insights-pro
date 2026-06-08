import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/axios';

const STALE = 10 * 60 * 1000;

export const useInventoryOverview = () =>
  useQuery({
    queryKey: ['inventory', 'overview'],
    queryFn: () => api.get('/products/inventory/overview').then((r) => r.data.data),
    staleTime: STALE,
  });

export const useStockoutPredictions = () =>
  useQuery({
    queryKey: ['inventory', 'stockout'],
    queryFn: () => api.get('/products/inventory/stockout').then((r) => r.data.data),
    staleTime: STALE,
  });

export const useReorderRecommendations = () =>
  useQuery({
    queryKey: ['inventory', 'reorder'],
    queryFn: () => api.get('/products/inventory/reorder').then((r) => r.data.data),
    staleTime: STALE,
  });

export const useLowStockAlerts = () =>
  useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: () => api.get('/products/inventory/low-stock').then((r) => r.data.data),
    staleTime: STALE,
  });

export const useDeadInventory = () =>
  useQuery({
    queryKey: ['inventory', 'dead'],
    queryFn: () => api.get('/products/inventory/dead').then((r) => r.data.data),
    staleTime: STALE,
  });

export const useProducts = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['products', params],
    queryFn: () => api.get('/products', { params }).then((r) => r.data),
    staleTime: STALE,
  });

export const useProductById = (id: string) =>
  useQuery({
    queryKey: ['products', id],
    queryFn: () => api.get(`/products/${id}`).then((r) => r.data.data),
    enabled: !!id,
    staleTime: STALE,
  });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/products', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/products/${id}`, data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useAdjustStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adjustment, reason }: { id: string; adjustment: number; reason?: string }) =>
      api.patch(`/products/${id}/stock`, { adjustment, reason }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

export const useComputeInventoryMetrics = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/products/inventory/compute').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
};
