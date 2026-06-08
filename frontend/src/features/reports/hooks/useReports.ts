import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/axios';

const STALE = 2 * 60 * 1000;

export interface GenerateReportParams {
  type: string;
  format: 'pdf' | 'excel' | 'csv';
  title: string;
  startDate?: string;
  endDate?: string;
}

export const useReports = (params?: { page?: number; type?: string; format?: string }) =>
  useQuery({
    queryKey: ['reports', params],
    queryFn: () => api.get('/reports', { params }).then((r) => r.data),
    staleTime: STALE,
  });

export const useReportStats = () =>
  useQuery({
    queryKey: ['reports', 'stats'],
    queryFn: () => api.get('/reports/stats').then((r) => r.data.data),
    staleTime: STALE,
  });

export const useGenerateReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: GenerateReportParams) =>
      api.post('/reports', params).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });
};

export const useDeleteReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/reports/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });
};

export const downloadReport = async (id: string, filename: string) => {
  const response = await api.get(`/reports/${id}/download`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
