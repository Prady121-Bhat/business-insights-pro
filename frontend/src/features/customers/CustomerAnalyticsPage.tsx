import { useState } from 'react';
import {
  Grid, Card, CardContent, CardHeader, Box, Typography, Button,
  Tab, Tabs, Chip, Alert, Table, TableBody, TableCell,
  TableHead, TableRow, Avatar, LinearProgress, Divider,
  ToggleButtonGroup, ToggleButton, IconButton, Tooltip,
} from '@mui/material';
import {
  RefreshOutlined, PeopleOutlined, WarningAmberOutlined,
  TrendingDownOutlined, StarOutlined, AttachMoneyOutlined,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { PageHeader } from '../../components/common/PageHeader';
import { KPICard } from '../../components/common/KPICard';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { BarChart } from '../../components/charts/BarChart';
import { AreaChart } from '../../components/charts/AreaChart';
import { DonutChart } from '../../components/charts/DonutChart';
import { RFMSegmentChart } from './components/RFMSegmentChart';
import { ChurnRiskTable } from './components/ChurnRiskTable';
import { CohortTable } from './components/CohortTable';
import {
  useRFMData, useCLVData, useChurnData,
  useCohortData, useRetentionCurve, useSegmentSummary, useRunAllAnalytics,
} from './hooks/useCustomers';
import { useCustomerAnalytics } from '../dashboard/hooks/useAnalytics';
import { formatCurrency, formatCompactNumber } from '../../utils/formatters';
import { SEGMENT_COLORS } from '../../styles/theme';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { showSnackbar } from '../../app/uiSlice';

const TABS = ['Overview', 'RFM Analysis', 'CLV Analysis', 'Churn Risk', 'Cohort & Retention'];

export const CustomerAnalyticsPage = () => {
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState(0);
  const [cohortMonths, setCohortMonths] = useState(6);
  const [retentionMonths, setRetentionMonths] = useState(12);

  const overview = useCustomerAnalytics();
  const rfm = useRFMData();
  const clv = useCLVData();
  const churn = useChurnData();
  const cohort = useCohortData(cohortMonths);
  const retention = useRetentionCurve(retentionMonths);
  const segments = useSegmentSummary();
  const runAll = useRunAllAnalytics();

  const handleRefresh = async () => {
    try {
      await runAll.mutateAsync();
      dispatch(showSnackbar({ message: 'Analytics refreshed successfully', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Analytics refresh failed', severity: 'error' }));
    }
  };

  const retentionChartData = retention.data?.map((r: any) => ({
    label: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
    value: r.customerCount,
  })) ?? [];

  const clvBySegment = clv.data?.distribution?.map((s: any) => ({
    name: s.segment.charAt(0).toUpperCase() + s.segment.slice(1),
    value: s.avgCLV,
    color: SEGMENT_COLORS[s.segment],
  })) ?? [];

  return (
    <Box>
      <PageHeader
        title="Customer Analytics"
        subtitle="RFM segmentation, CLV, churn prediction and cohort analysis"
        breadcrumbs={[{ label: 'Analytics' }, { label: 'Customers' }]}
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshOutlined />}
            onClick={handleRefresh}
            disabled={runAll.isPending}
            size="small"
          >
            {runAll.isPending ? 'Running…' : 'Refresh Analytics'}
          </Button>
        }
      />

      {/* Overview KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Total Customers', value: overview.data?.totalCustomers ?? 0, icon: <PeopleOutlined fontSize="small" />, isCurrency: false },
          { title: 'Retention Rate', value: overview.data?.retentionRate ?? 0, icon: <StarOutlined fontSize="small" />, isPercent: true, color: '#10B981' },
          { title: 'At-Risk Customers', value: overview.data?.atRiskCount ?? 0, icon: <WarningAmberOutlined fontSize="small" />, isCurrency: false, color: '#F59E0B' },
          { title: 'Churned Customers', value: overview.data?.churnedCount ?? 0, icon: <TrendingDownOutlined fontSize="small" />, isCurrency: false, color: '#EF4444' },
        ].map((card, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <KPICard {...card} isLoading={overview.isLoading} />
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {TABS.map((t) => <Tab key={t} label={t} />)}
        </Tabs>

        {/* Overview Tab */}
        {tab === 0 && (
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" mb={2}>Segment Distribution</Typography>
                {segments.isLoading ? <LoadingState height={260} /> : (
                  <DonutChart
                    data={(segments.data ?? []).map((s: any) => ({
                      name: s._id.charAt(0).toUpperCase() + s._id.slice(1),
                      value: s.count,
                      color: SEGMENT_COLORS[s._id],
                    }))}
                    height={260}
                    centerLabel="Segments"
                    centerValue={String(segments.data?.length ?? 0)}
                  />
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" mb={2}>Revenue by Segment</Typography>
                {segments.isLoading ? <LoadingState height={260} /> : (
                  <BarChart
                    data={(segments.data ?? []).map((s: any) => ({
                      name: s._id.charAt(0).toUpperCase() + s._id.slice(1),
                      value: s.totalRevenue,
                    }))}
                    height={260}
                    multiColor
                    isCurrency
                    label="Revenue"
                  />
                )}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" mb={2}>Top 10 Customers by Revenue</Typography>
                {overview.isLoading ? <LoadingState height={200} /> : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Segment</TableCell>
                        <TableCell align="right">Orders</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell align="right">Avg Order</TableCell>
                        <TableCell>Churn Risk</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(overview.data?.topCustomers ?? []).map((c: any, i: number) => (
                        <TableRow key={c._id} hover>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary" fontWeight={600}>#{i + 1}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: 'primary.main' }}>
                                {c.firstName[0]}{c.lastName[0]}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={500}>{c.firstName} {c.lastName}</Typography>
                                {c.email && <Typography variant="caption" color="text.secondary">{c.email}</Typography>}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={c.segment}
                              size="small"
                              sx={{ bgcolor: `${SEGMENT_COLORS[c.segment]}22`, color: SEGMENT_COLORS[c.segment], fontSize: 10, textTransform: 'capitalize' }}
                            />
                          </TableCell>
                          <TableCell align="right">{c.metrics.totalOrders}</TableCell>
                          <TableCell align="right"><Typography fontWeight={600} variant="body2">{formatCurrency(c.metrics.totalRevenue)}</Typography></TableCell>
                          <TableCell align="right">{formatCurrency(c.metrics.averageOrderValue ?? 0)}</TableCell>
                          <TableCell>
                            <Chip
                              label={c.churnRisk?.level ?? 'N/A'}
                              size="small"
                              color={c.churnRisk?.level === 'high' ? 'error' : c.churnRisk?.level === 'medium' ? 'warning' : 'success'}
                              variant="outlined"
                              sx={{ fontSize: 10, textTransform: 'capitalize' }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Grid>
            </Grid>
          </CardContent>
        )}

        {/* RFM Tab */}
        {tab === 1 && (
          <CardContent>
            {rfm.isLoading ? <LoadingState /> :
             rfm.isError ? <ErrorState onRetry={() => rfm.refetch()} /> :
             <RFMSegmentChart data={rfm.data?.distribution ?? []} />}
          </CardContent>
        )}

        {/* CLV Tab */}
        {tab === 2 && (
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <Typography variant="h6" mb={2}>CLV by Segment</Typography>
                {clv.isLoading ? <LoadingState height={260} /> : (
                  <BarChart data={clvBySegment} height={260} isCurrency multiColor label="Avg CLV" />
                )}
              </Grid>
              <Grid item xs={12} md={7}>
                <Typography variant="h6" mb={2}>Top Customers by Lifetime Value</Typography>
                {clv.isLoading ? <LoadingState height={260} /> : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Customer</TableCell>
                        <TableCell>Segment</TableCell>
                        <TableCell align="right">LTV</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell align="right">Orders</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(clv.data?.topCustomers ?? []).slice(0, 10).map((c: any) => (
                        <TableRow key={c._id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: 'secondary.main' }}>
                                {c.firstName[0]}{c.lastName[0]}
                              </Avatar>
                              <Typography variant="body2">{c.firstName} {c.lastName}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={c.segment} size="small" sx={{ fontSize: 10, textTransform: 'capitalize' }} />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={700} color="success.main">
                              {formatCurrency(c.metrics.lifetimeValue ?? 0)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{formatCurrency(c.metrics.totalRevenue)}</TableCell>
                          <TableCell align="right">{c.metrics.totalOrders}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Grid>
            </Grid>
          </CardContent>
        )}

        {/* Churn Tab */}
        {tab === 3 && (
          <CardContent>
            {churn.isLoading ? <LoadingState /> : churn.data && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Grid container spacing={2}>
                    {[
                      { label: 'High Risk', value: churn.data.summary.high, color: 'error.main' },
                      { label: 'Medium Risk', value: churn.data.summary.medium, color: 'warning.main' },
                      { label: 'At-Risk Revenue', value: churn.data.summary.atRiskRevenue, color: 'error.main', isCurrency: true },
                      { label: 'At-Risk Rate', value: churn.data.summary.atRiskRate.toFixed(1) + '%', color: 'text.primary' },
                    ].map((s) => (
                      <Grid item xs={6} key={s.label}>
                        <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight={700} color={s.color}>
                            {s.isCurrency ? formatCurrency(Number(s.value)) : s.value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Typography variant="h6" mb={2}>At-Risk Customers</Typography>
                  <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                    <ChurnRiskTable customers={churn.data.atRisk ?? []} />
                  </Box>
                </Grid>
              </Grid>
            )}
          </CardContent>
        )}

        {/* Cohort & Retention Tab */}
        {tab === 4 && (
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Cohort Analysis</Typography>
                  <ToggleButtonGroup value={cohortMonths} exclusive onChange={(_, v) => v && setCohortMonths(v)} size="small">
                    {[3, 6, 12].map((m) => <ToggleButton key={m} value={m} sx={{ px: 1.5, fontSize: 12 }}>{m}M</ToggleButton>)}
                  </ToggleButtonGroup>
                </Box>
                {cohort.isLoading ? <LoadingState height={200} /> : <CohortTable data={cohort.data ?? []} />}
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 2 }}>
                  <Typography variant="h6">Monthly Active Customers</Typography>
                  <ToggleButtonGroup value={retentionMonths} exclusive onChange={(_, v) => v && setRetentionMonths(v)} size="small">
                    {[6, 12, 24].map((m) => <ToggleButton key={m} value={m} sx={{ px: 1.5, fontSize: 12 }}>{m}M</ToggleButton>)}
                  </ToggleButtonGroup>
                </Box>
                {retention.isLoading ? <LoadingState height={200} /> : (
                  <AreaChart data={retentionChartData} height={220} isCurrency={false} label="Active Customers" color="#10B981" />
                )}
              </Grid>
            </Grid>
          </CardContent>
        )}
      </Card>
    </Box>
  );
};
