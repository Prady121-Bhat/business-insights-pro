import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/axios';

const STALE = 15 * 60 * 1000;

export interface ForecastParams {
  metric: string;
  periods: number;
  algorithm: string;
  granularity: string;
  confidenceLevel?: number;
}

export const useGenerateForecast = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: ForecastParams) =>
      api.post('/forecasting/generate', params).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forecasting', 'saved'] }),
  });
};

export const useSavedForecasts = () =>
  useQuery({
    queryKey: ['forecasting', 'saved'],
    queryFn: () => api.get('/forecasting/saved').then((r) => r.data.data),
    staleTime: STALE,
  });

export const useHistoricalData = (metric: string, granularity: string, enabled = true) =>
  useQuery({
    queryKey: ['forecasting', 'historical', metric, granularity],
    queryFn: () => api.get('/forecasting/historical', { params: { metric, granularity } }).then((r) => r.data.data),
    staleTime: STALE,
    enabled,
  });

export const useAnalyticsServiceHealth = () =>
  useQuery({
    queryKey: ['forecasting', 'health'],
    queryFn: () => api.get('/forecasting/health').then((r) => r.data),
    staleTime: 60 * 1000,
    retry: false,
  });
