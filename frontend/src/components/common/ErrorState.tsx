import { Box, Typography, Button } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

interface Props { message?: string; onRetry?: () => void }

export const ErrorState = ({ message = 'Failed to load data.', onRetry }: Props) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 1.5 }}>
    <ErrorOutline sx={{ fontSize: 40, color: 'error.main' }} />
    <Typography variant="body2" color="text.secondary">{message}</Typography>
    {onRetry && <Button size="small" onClick={onRetry} variant="outlined">Retry</Button>}
  </Box>
);
