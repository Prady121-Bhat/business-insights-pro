import {
  Popover, Box, Typography, IconButton, Divider, Button,
  List, ListItem, ListItemText, Chip, CircularProgress,
  Tooltip,
} from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  useNotifications, useMarkRead, useMarkAllRead,
  useDeleteNotification, useClearRead,
} from '../../features/notifications/hooks/useNotifications';

const SEVERITY_BORDER: Record<string, string> = {
  error: '#f44336',
  warning: '#ff9800',
  success: '#4caf50',
  info: '#2196f3',
};

interface Props {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

export function NotificationPopover({ anchorEl, onClose }: Props) {
  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  const { data, isLoading } = useNotifications({ limit: 20 });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const deleteOne = useDeleteNotification();
  const clearRead = useClearRead();

  const notifications = data?.data ?? [];

  const handleClick = (n: any) => {
    if (!n.isRead) markRead.mutate([n._id]);
    if (n.actionUrl) {
      onClose();
      navigate(n.actionUrl);
    }
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      PaperProps={{ sx: { width: 400, maxHeight: 520, display: 'flex', flexDirection: 'column', mt: 1 } }}
    >
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <Typography variant="subtitle1" fontWeight={700}>Notifications</Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Mark all read">
            <IconButton size="small" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
              <DoneAllIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear read">
            <IconButton size="small" onClick={() => clearRead.mutate()} disabled={clearRead.isPending}>
              <DeleteSweepIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Divider />

      {/* List */}
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : !notifications.length ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No notifications</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {notifications.map((n: any, idx: number) => (
              <Box key={n._id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    cursor: n.actionUrl ? 'pointer' : 'default',
                    bgcolor: n.isRead ? 'transparent' : 'action.hover',
                    borderLeft: `3px solid ${SEVERITY_BORDER[n.severity] ?? '#9e9e9e'}`,
                    '&:hover': { bgcolor: 'action.selected' },
                    pr: 1,
                  }}
                  onClick={() => handleClick(n)}
                  secondaryAction={
                    <Tooltip title="Delete">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); deleteOne.mutate(n._id); }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography variant="body2" fontWeight={n.isRead ? 400 : 600} sx={{ flex: 1 }}>
                          {n.title}
                        </Typography>
                        {!n.isRead && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                          {n.message}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="caption" color="text.disabled">
                            {format(new Date(n.createdAt), 'MMM d, HH:mm')}
                          </Typography>
                          <Chip label={n.severity} size="small" sx={{ height: 16, fontSize: 10 }} />
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                {idx < notifications.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </Box>

      {/* Footer */}
      <Divider />
      <Box sx={{ p: 1, flexShrink: 0 }}>
        <Button
          fullWidth
          size="small"
          endIcon={<OpenInNewIcon fontSize="small" />}
          onClick={() => { onClose(); navigate('/notifications'); }}
        >
          View All
        </Button>
      </Box>
    </Popover>
  );
}
