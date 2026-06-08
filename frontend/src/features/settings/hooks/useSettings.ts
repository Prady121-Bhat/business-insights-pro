import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/axios';

const KEY = ['settings'];

export const useSettings = () =>
  useQuery({
    queryKey: KEY,
    queryFn: () => api.get('/settings').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

export const useUpdateSection = (section: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      api.patch(`/settings/${section}`, data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useUpdateCompany = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      api.patch('/settings/company', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useUploadLogo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('logo', file);
      return api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useDeleteLogo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/settings/logo'),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
