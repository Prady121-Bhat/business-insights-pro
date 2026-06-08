import { Box, CircularProgress, Typography } from '@mui/material';

interface Props { message?: string; height?: number | string }

export const LoadingState = ({ message = 'Loading...', height = 300 }: Props) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height, gap: 2 }}>
    <CircularProgress size={36} />
    <Typography variant="body2" color="text.secondary">{message}</Typography>
  </Box>
);

export const ChartSkeleton = ({ height = 300 }: { height?: number }) => (
  <Box sx={{
    height, display: 'flex', alignItems: 'flex-end', gap: 1, p: 2,
    background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.03) 100%)',
    borderRadius: 2,
  }}>
    {Array.from({ length: 12 }, (_, i) => (
      <Box key={i} sx={{
        flex: 1,
        height: `${20 + Math.random() * 60}%`,
        borderRadius: '4px 4px 0 0',
        bgcolor: 'action.hover',
        animation: 'pulse 1.5s ease-in-out infinite',
        animationDelay: `${i * 0.1}s`,
        '@keyframes pulse': {
          '0%': { opacity: 1 },
          '50%': { opacity: 0.4 },
          '100%': { opacity: 1 },
        },
      }} />
    ))}
  </Box>
);
