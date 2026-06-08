import { useState } from 'react';
import {
  Grid, Card, CardContent, Box, Typography, Button, Chip, Alert,
  ToggleButtonGroup, ToggleButton, Skeleton, Divider, Badge,
  Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import {
  AutoGraphOutlined, RefreshOutlined, ErrorOutlined, WarningAmberOutlined,
  CheckCircleOutlined, InfoOutlined, NotificationsOutlined, DoneAllOutlined,
} from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { InsightCard } from './components/InsightCard';
import {
  useInsights, useInsightsSummary, useRefreshInsights,
  useNotificationHistory, useMarkAllRead,
} from './hooks/useInsights';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { showSnackbar } from '../../app/uiSlice';

const CATEGORIES = ['all', 'revenue', 'inventory', 'customers', 'expenses', 'growth', 'operations'];
const SEVERITIES = ['all', 'error', 'warning', 'success', 'info'];

const SEVERITY_CONFIG = {
  error: { color: '#EF4444', icon: <ErrorOutlined sx={{ fontSize: 16 }} />, label: 'Critical' },
  warning: { color: '#F59E0B', icon: <WarningAmberOutlined sx={{ fontSize: 16 }} />, label: 'Warnings' },
  success: { color: '#10B981', icon: <CheckCircleOutlined sx={{ fontSize: 16 }} />, label: 'Positive' },
  info: { color: '#3B82F6', icon: <InfoOutlined sx={{ fontSize: 16 }} />, label: 'Info' },
};

export const AIInsightsPage = () => {
  const dispatch = useAppDispatch();
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [tab, setTab] = useState(0);

  const insightsQuery = useInsights({
    category: category !== 'all' ? category : undefined,
    severity: severity !== 'all' ? severity : undefined,
  });
  const summary = useInsightsSummary();
  const refresh = useRefreshInsights();
  const notifications = useNotificationHistory({ page: 1 });
  const markAllRead = useMarkAllRead();

  const insights = insightsQuery.data?.data ?? [];
  const isLoading = insightsQuery.isLoading;

  const handleRefresh = async () => {
    try {
      await refresh.mutateAsync();
      dispatch(showSnackbar({ message: 'AI analysis complete', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Refresh failed', severity: 'error' }));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
      dispatch(showSnackbar({ message: 'All notifications marked read', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to mark read', severity: 'error' }));
    }
  };

  const criticalCount = summary.data?.bySeverity?.error ?? 0;

  return (
    <Box>
      <PageHeader
        title="AI Insights"
        subtitle="Automated business intelligence — revenue anomalies, customer health, inventory risks, growth opportunities"
        breadcrumbs={[{ label: 'AI Insights' }]}
        actions={
          <Button
            variant="contained"
            startIcon={<RefreshOutlined />}
            onClick={handleRefresh}
            disabled={refresh.isPending}
            size="small"
          >
            {refresh.isPending ? 'Analysing…' : 'Run AI Analysis'}
          </Button>
        }
      />

      {/* Critical alert banner */}
      {criticalCount > 0 && (
        <Alert severity="error" sx={{ mb: 2 }} icon={<ErrorOutlined />}>
          <strong>{criticalCount} critical issue{criticalCount > 1 ? 's' : ''} detected</strong> — immediate action required to protect revenue and profitability.
        </Alert>
      )}

      {/* Summary tiles */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => {
          const count = summary.data?.bySeverity?.[key] ?? 0;
          return (
            <Grid item xs={6} sm={3} key={key}>
              <Card
                variant="outlined"
                onClick={() => setSeverity(severity === key ? 'all' : key)}
                sx={{
                  cursor: 'pointer',
                  borderColor: severity === key ? cfg.color : 'divider',
                  borderWidth: severity === key ? 2 : 1,
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: cfg.color, boxShadow: 2 },
                }}
              >
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '12px !important' }}>
                  <Box sx={{ color: cfg.color }}>{cfg.icon}</Box>
                  <Box>
                    <Typography variant="h5" fontWeight={800} color={cfg.color}>{count}</Typography>
                    <Typography variant="caption" color="text.secondary">{cfg.label}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Tabs */}
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}>
          <Tab label="Insights" icon={<AutoGraphOutlined sx={{ fontSize: 16 }} />} iconPosition="start" sx={{ minHeight: 48 }} />
          <Tab
            label={
              <Badge badgeContent={notifications.data?.pagination?.total} color="error" max={99}>
                Notifications
              </Badge>
            }
            icon={<NotificationsOutlined sx={{ fontSize: 16 }} />}
            iconPosition="start"
            sx={{ minHeight: 48 }}
          />
        </Tabs>

        {/* Insights tab */}
        {tab === 0 && (
          <CardContent>
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Category</Typography>
                <ToggleButtonGroup
                  value={category}
                  exclusive
                  onChange={(_, v) => v && setCategory(v)}
                  size="small"
                >
                  {CATEGORIES.map((c) => (
                    <ToggleButton key={c} value={c} sx={{ px: 1.5, py: 0.5, fontSize: 11, textTransform: 'capitalize' }}>
                      {c}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Severity</Typography>
                <ToggleButtonGroup
                  value={severity}
                  exclusive
                  onChange={(_, v) => v && setSeverity(v)}
                  size="small"
                >
                  {SEVERITIES.map((s) => (
                    <ToggleButton key={s} value={s} sx={{ px: 1.5, py: 0.5, fontSize: 11, textTransform: 'capitalize' }}>
                      {s}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'flex-end' }}>
                <Typography variant="caption" color="text.secondary">
                  {insights.length} insight{insights.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Box>

            {/* Category breakdown */}
            {summary.data?.byCategory && Object.keys(summary.data.byCategory).length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {Object.entries(summary.data.byCategory as Record<string, number>).map(([cat, count]) => (
                  <Chip
                    key={cat}
                    label={`${cat}: ${count}`}
                    size="small"
                    variant={category === cat ? 'filled' : 'outlined'}
                    color={category === cat ? 'primary' : 'default'}
                    onClick={() => setCategory(category === cat ? 'all' : cat)}
                    sx={{ fontSize: 11, textTransform: 'capitalize', cursor: 'pointer' }}
                  />
                ))}
              </Box>
            )}

            <Divider sx={{ mb: 2 }} />

            {/* Insight cards */}
            {isLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={130} animation="wave" />
                ))}
              </Box>
            ) : insights.length === 0 ? (
              <EmptyState
                title="No insights match your filters"
                description="Try changing category or severity filters, or run a fresh AI analysis."
                icon={<AutoGraphOutlined sx={{ fontSize: 48, color: 'success.main' }} />}
              />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {insights.map((insight: any, i: number) => (
                  <InsightCard key={insight.type} insight={insight} index={i} />
                ))}
              </Box>
            )}
          </CardContent>
        )}

        {/* Notifications tab */}
        {tab === 1 && (
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Notification History</Typography>
              <Button
                size="small"
                startIcon={<DoneAllOutlined />}
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                variant="outlined"
              >
                Mark All Read
              </Button>
            </Box>

            {notifications.isLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[...Array(5)].map((_, i) => <Skeleton key={i} height={60} animation="wave" />)}
              </Box>
            ) : !notifications.data?.data?.length ? (
              <EmptyState title="No notifications" description="Run AI analysis to generate notifications." />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Severity</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {notifications.data.data.map((n: any) => {
                    const cfg = SEVERITY_CONFIG[n.severity as keyof typeof SEVERITY_CONFIG];
                    return (
                      <TableRow key={n._id} hover sx={{ opacity: n.isRead ? 0.65 : 1 }}>
                        <TableCell>
                          <Box sx={{ color: cfg?.color ?? 'text.primary', display: 'flex', alignItems: 'center' }}>
                            {cfg?.icon}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={n.isRead ? 400 : 700}>{n.title}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>{n.message}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={n.isRead ? 'Read' : 'New'}
                            size="small"
                            color={n.isRead ? 'default' : 'primary'}
                            sx={{ fontSize: 10 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        )}
      </Card>
    </Box>
  );
};
