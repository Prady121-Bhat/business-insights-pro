import { Box, Typography, Button } from '@mui/material';
import { InboxOutlined } from '@mui/icons-material';

interface Props { title?: string; description?: string; action?: { label: string; onClick: () => void }; icon?: React.ReactNode }

export const EmptyState = ({ title = 'No data', description = 'Nothing to display yet.', action, icon }: Props) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 1.5 }}>
    {icon || <InboxOutlined sx={{ fontSize: 48, color: 'text.disabled' }} />}
    <Typography variant="h6" color="text.secondary" fontWeight={500}>{title}</Typography>
    <Typography variant="body2" color="text.disabled" textAlign="center" maxWidth={300}>{description}</Typography>
    {action && <Button variant="outlined" size="small" onClick={action.onClick} sx={{ mt: 1 }}>{action.label}</Button>}
  </Box>
);
