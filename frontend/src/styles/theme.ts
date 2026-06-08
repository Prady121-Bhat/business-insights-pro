import { createTheme, alpha } from '@mui/material/styles';

const BRAND = {
  primary: '#1976D2',
  primaryDark: '#1565C0',
  primaryLight: '#42A5F5',
  secondary: '#7C3AED',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#0EA5E9',
};

const sharedComponents = {
  MuiButton: {
    styleOverrides: {
      root: { borderRadius: 8, textTransform: 'none' as const, fontWeight: 600 },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: { borderRadius: 12, boxShadow: 'none' },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: { borderRadius: 6 },
    },
  },
};

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: BRAND.primary, dark: BRAND.primaryDark, light: BRAND.primaryLight },
    secondary: { main: BRAND.secondary },
    success: { main: BRAND.success },
    warning: { main: BRAND.warning },
    error: { main: BRAND.error },
    info: { main: BRAND.info },
    background: { default: '#F8FAFC', paper: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#64748B' },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, fontSize: '2rem' },
    h2: { fontWeight: 700, fontSize: '1.75rem' },
    h3: { fontWeight: 600, fontSize: '1.5rem' },
    h4: { fontWeight: 600, fontSize: '1.25rem' },
    h5: { fontWeight: 600, fontSize: '1.125rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    body1: { fontSize: '0.9375rem' },
    body2: { fontSize: '0.875rem' },
  },
  shape: { borderRadius: 8 },
  components: {
    ...sharedComponents,
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: 'none',
          border: '1px solid #E2E8F0',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: { '& .MuiTableCell-head': { backgroundColor: '#F8FAFC', fontWeight: 600, color: '#475569' } },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&:hover': { backgroundColor: alpha('#1976D2', 0.04) } },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 4 } },
    },
    MuiInputBase: {
      styleOverrides: { root: { borderRadius: '8px !important' } },
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: BRAND.primaryLight, dark: BRAND.primary, light: '#90CAF9' },
    secondary: { main: '#A78BFA' },
    success: { main: '#34D399' },
    warning: { main: '#FCD34D' },
    error: { main: '#F87171' },
    info: { main: '#38BDF8' },
    background: { default: '#0F172A', paper: '#1E293B' },
    text: { primary: '#F1F5F9', secondary: '#94A3B8' },
    divider: '#334155',
  },
  typography: lightTheme.typography,
  shape: { borderRadius: 8 },
  components: {
    ...sharedComponents,
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: 'none',
          border: '1px solid #334155',
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: { '& .MuiTableCell-head': { backgroundColor: '#1E293B', fontWeight: 600, color: '#94A3B8' } },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&:hover': { backgroundColor: alpha('#42A5F5', 0.08) } },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 4 } },
    },
    MuiInputBase: {
      styleOverrides: { root: { borderRadius: '8px !important' } },
    },
  },
});

export const CHART_COLORS = [
  '#1976D2', '#7C3AED', '#10B981', '#F59E0B',
  '#EF4444', '#0EA5E9', '#EC4899', '#14B8A6',
  '#F97316', '#8B5CF6',
];

export const SEGMENT_COLORS: Record<string, string> = {
  vip: '#F59E0B',
  loyal: '#10B981',
  regular: '#1976D2',
  at_risk: '#EF4444',
  lost: '#94A3B8',
  new: '#7C3AED',
};

export const SEVERITY_COLORS: Record<string, string> = {
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#0EA5E9',
};
