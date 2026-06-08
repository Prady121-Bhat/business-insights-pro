import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/axios';

const STALE = 30 * 1000;

export const useImportJobs = (params?: { entityType?: string; status?: string }) =>
  useQuery({
    queryKey: ['imports', 'jobs', params],
    queryFn: () => api.get('/imports/jobs', { params }).then((r) => r.data),
    staleTime: STALE,
    refetchInterval: 10 * 1000,
  });

export const useImportJob = (id: string, enabled = true) =>
  useQuery({
    queryKey: ['imports', 'jobs', id],
    queryFn: () => api.get(`/imports/jobs/${id}`).then((r) => r.data.data),
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'processing') return 2000;
      if (status === 'pending' || status === 'validating') return 5000;
      return false;
    },
    enabled: !!id && enabled,
  });

export const useFieldDefs = (entityType: string) =>
  useQuery({
    queryKey: ['imports', 'fields', entityType],
    queryFn: () => api.get(`/imports/fields/${entityType}`).then((r) => r.data.data),
    enabled: !!entityType,
    staleTime: Infinity,
  });

export const useUploadFile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, entityType }: { file: File; entityType: string }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('entityType', entityType);
      return api.post('/imports/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['imports', 'jobs'] }),
  });
};

export const useValidateMapping = () =>
  useMutation({
    mutationFn: ({ jobId, mapping }: { jobId: string; mapping: Record<string, string> }) =>
      api.post('/imports/validate', { jobId, mapping }).then((r) => r.data.data),
  });

export const useStartImport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      api.post('/imports/start', { jobId }).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['imports', 'jobs'] }),
  });
};

export const useCancelJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/imports/jobs/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['imports', 'jobs'] }),
  });
};
