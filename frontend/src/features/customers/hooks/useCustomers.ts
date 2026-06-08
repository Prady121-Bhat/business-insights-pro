import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axios';

const get = async <T>(url: string, params?: Record<string, any>): Promise<T> => {
  const { data } = await api.get(url, { params });
  return data.data as T;
};
const post = async <T>(url: string, body?: any): Promise<T> => {
  const { data } = await api.post(url, body);
  return data.data as T;
};

export const useCustomerList = (params?: Record<string, any>) =>
  useQuery({
    queryKey: ['customers', 'list', params],
    queryFn: () => get<any>('/customers', params),
    staleTime: 2 * 60 * 1000,
  });

export const useCustomer = (id: string) =>
  useQuery({
    queryKey: ['customers', id],
    queryFn: () => get<any>(`/customers/${id}`),
    enabled: !!id,
  });

export const useCustomerSales = (id: string, page = 1) =>
  useQuery({
    queryKey: ['customers', id, 'sales', page],
    queryFn: () => get<any>(`/customers/${id}/sales`, { page }),
    enabled: !!id,
  });

export const useRFMData = () =>
  useQuery({
    queryKey: ['customers', 'analytics', 'rfm'],
    queryFn: () => get<any>('/customers/analytics/rfm'),
    staleTime: 15 * 60 * 1000,
  });

export const useCLVData = () =>
  useQuery({
    queryKey: ['customers', 'analytics', 'clv'],
    queryFn: () => get<any>('/customers/analytics/clv'),
    staleTime: 15 * 60 * 1000,
  });

export const useChurnData = () =>
  useQuery({
    queryKey: ['customers', 'analytics', 'churn'],
    queryFn: () => get<any>('/customers/analytics/churn'),
    staleTime: 15 * 60 * 1000,
  });

export const useCohortData = (months = 6) =>
  useQuery({
    queryKey: ['customers', 'analytics', 'cohort', months],
    queryFn: () => get<any>('/customers/analytics/cohort', { months }),
    staleTime: 15 * 60 * 1000,
  });

export const useRetentionCurve = (months = 12) =>
  useQuery({
    queryKey: ['customers', 'analytics', 'retention', months],
    queryFn: () => get<any>('/customers/analytics/retention', { months }),
    staleTime: 15 * 60 * 1000,
  });

export const useSegmentSummary = () =>
  useQuery({
    queryKey: ['customers', 'analytics', 'segments'],
    queryFn: () => get<any>('/customers/analytics/segments'),
    staleTime: 10 * 60 * 1000,
  });

export const useRunAllAnalytics = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post<any>('/customers/analytics/run-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers', 'analytics'] }),
  });
};
