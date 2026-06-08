import {
  Box, Typography, Paper, Button, Chip, IconButton,
  List, ListItem, ListItemText, Divider, Select, MenuItem,
  FormControl, InputLabel, Stack, Tooltip, CircularProgress,
  ToggleButtonGroup, ToggleButton, Pagination,
} from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DeleteIcon from '@mui/icons-material/Delete';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  useNotifications, useMarkRead, useMarkAllRead,
  useDeleteNotification, useClearRead, useUnreadCount,
} from './hooks/useNotifications';

const SEVERITY_COLORS: Record<string, 'default' | 'error' | 'warning' | 'success' | 'info'> = {
  error: 'error', warning: 'warning', success: 'success', info: 'info',
};

const SEVERITY_BORDER: Record<string, string> = {
  error: '#f44336', warning: '#ff9800', success: '#4caf50', info: '#2196f3',
};

const TYPE_LABELS: Record<string, string> = {
  revenue_drop: 'Revenue Drop', revenue_spike: 'Revenue Spike',
  low_inventory: 'Low Inventory', stockout: 'Stockout',
  churn_risk: 'Churn Risk', new_customer: 'New Customer',
  forecast_ready: 'Forecast', report_ready: 'Report',
  import_complete: 'Import', import_failed: 'Import Failed',
  system_alert: 'System', subscription_expiring: 'Subscription',
  payment_failed: 'Payment',
};

export function NotificationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useNotifications({ page, limit: 25, severity: severity || undefined, unread: unreadOnly || undefined });
  const { data: unreadCount = 0 } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const deleteOne = useDeleteNotification();
  const clearRead = useClearRead();

  const notifications = data?.data ?? [];
  const totalPages = data?.pages ?? 1;

  const handleClick = (n: any) => {
    if (!n.isRead) markRead.mutate([n._id]);
    if (n.actionUrl) navigate(n.actionUrl);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Notifications</Typography>
          {unreadCount > 0 && (
            <Typography variant="body2" color="text.secondary">
              {unreadCount} unread
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Mark all read">
            <Button
              size="small"
              variant="outlined"
              startIcon={<DoneAllIcon />}
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending || unreadCount === 0}
            >
              Mark all read
            </Button>
          </Tooltip>
          <Tooltip title="Delete read notifications">
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={() => clearRead.mutate()}
              disabled={clearRead.isPending}
            >
              Clear read
            </Button>
          </Tooltip>
        </Stack>
      </Box>

      {/* Filters */}
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup
          size="small"
          value={unreadOnly ? 'unread' : 'all'}
          exclusive
          onChange={(_, val) => { setUnreadOnly(val === 'unread'); setPage(1); }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="unread">Unread</ToggleButton>
        </ToggleButtonGroup>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Severity</InputLabel>
          <Select
            value={severity}
            label="Severity"
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
          >
            <MenuItem value="">All severities</MenuItem>
            <MenuItem value="error">Error</MenuItem>
            <MenuItem value="warning">Warning</MenuItem>
            <MenuItem value="success">Success</MenuItem>
            <MenuItem value="info">Info</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* List */}
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
        {isLoading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress size={32} />
          </Box>
        ) : !notifications.length ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">No notifications found.</Typography>
          </Box>
        ) : (
          <List disablePadding>
            <AnimatePresence initial={false}>
              {notifications.map((n: any, idx: number) => (
                <motion.div
                  key={n._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                >
                  <ListItem
                    alignItems="flex-start"
                    onClick={() => handleClick(n)}
                    sx={{
                      cursor: n.actionUrl ? 'pointer' : 'default',
                      bgcolor: n.isRead ? 'transparent' : 'action.hover',
                      borderLeft: `4px solid ${SEVERITY_BORDER[n.severity] ?? '#9e9e9e'}`,
                      '&:hover': { bgcolor: 'action.selected' },
                      pr: 8,
                    }}
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body1" fontWeight={n.isRead ? 400 : 600}>
                            {n.title}
                          </Typography>
                          {!n.isRead && (
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
                          )}
                          <Chip
                            label={SEVERITY_COLORS[n.severity] ? n.severity : 'info'}
                            color={SEVERITY_COLORS[n.severity] ?? 'default'}
                            size="small"
                            sx={{ height: 18, fontSize: 10 }}
                          />
                          {n.type && (
                            <Chip label={TYPE_LABELS[n.type] ?? n.type} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">{n.message}</Typography>
                          <Box sx={{ display: 'flex', gap: 2, mt: 0.75, alignItems: 'center' }}>
                            <Typography variant="caption" color="text.disabled">
                              {format(new Date(n.createdAt), 'MMM d, yyyy HH:mm')}
                            </Typography>
                            {n.isRead && n.readAt && (
                              <Typography variant="caption" color="text.disabled">
                                Read {format(new Date(n.readAt), 'MMM d, HH:mm')}
                              </Typography>
                            )}
                            {n.actionLabel && (
                              <Typography variant="caption" color="primary.main" fontWeight={500}>
                                {n.actionLabel} →
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  {idx < notifications.length - 1 && <Divider />}
                </motion.div>
              ))}
            </AnimatePresence>
          </List>
        )}
      </Paper>

      {totalPages > 1 && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
        </Box>
      )}
    </Box>
  );
}
