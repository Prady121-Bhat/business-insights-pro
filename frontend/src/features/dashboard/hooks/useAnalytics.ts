import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/axios';
import { OverviewKPIs, RevenueTrend, CustomerAnalytics, InventoryAnalytics, Insight, HeatmapPoint, TopProduct } from '../../../types';

const fetch = async <T>(url: string, params?: Record<string, any>): Promise<T> => {
  const { data } = await api.get(url, { params });
  return data.data as T;
};

export const useOverviewKPIs = (startDate?: string, endDate?: string) =>
  useQuery<OverviewKPIs>({
    queryKey: ['analytics', 'kpis', startDate, endDate],
    queryFn: () => fetch('/analytics/kpis', { startDate, endDate }),
    staleTime: 5 * 60 * 1000,
  });

export const useRevenueTrend = (granularity = 'day', startDate?: string, endDate?: string) =>
  useQuery<RevenueTrend>({
    queryKey: ['analytics', 'revenue-trend', granularity, startDate, endDate],
    queryFn: () => fetch('/analytics/revenue/trend', { granularity, startDate, endDate }),
    staleTime: 5 * 60 * 1000,
  });

export const useTopProducts = (limit = 10, startDate?: string, endDate?: string) =>
  useQuery<TopProduct[]>({
    queryKey: ['analytics', 'top-products', limit, startDate, endDate],
    queryFn: () => fetch('/analytics/products/top', { limit, startDate, endDate }),
    staleTime: 5 * 60 * 1000,
  });

export const useCustomerAnalytics = () =>
  useQuery<CustomerAnalytics>({
    queryKey: ['analytics', 'customers'],
    queryFn: () => fetch('/analytics/customers'),
    staleTime: 10 * 60 * 1000,
  });

export const useInventoryAnalytics = () =>
  useQuery<InventoryAnalytics>({
    queryKey: ['analytics', 'inventory'],
    queryFn: () => fetch('/analytics/inventory'),
    staleTime: 10 * 60 * 1000,
  });

export const useHeatmap = (startDate?: string, endDate?: string) =>
  useQuery<HeatmapPoint[]>({
    queryKey: ['analytics', 'heatmap', startDate, endDate],
    queryFn: () => fetch('/analytics/sales/heatmap', { startDate, endDate }),
    staleTime: 10 * 60 * 1000,
  });

export const useInsights = () =>
  useQuery<Insight[]>({
    queryKey: ['analytics', 'insights'],
    queryFn: () => fetch('/analytics/insights'),
    staleTime: 15 * 60 * 1000,
  });
