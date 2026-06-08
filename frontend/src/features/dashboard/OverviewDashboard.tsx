import { useState } from 'react';
import {
  Grid, Card, CardContent, CardHeader, Box, Typography, ToggleButtonGroup,
  ToggleButton, Chip, Alert, AlertTitle, Divider, Table, TableBody,
  TableCell, TableHead, TableRow, LinearProgress, Tooltip, IconButton,
} from '@mui/material';
import {
  TrendingUpOutlined, PeopleOutlined, ShoppingCartOutlined,
  AccountBalanceWalletOutlined, InventoryOutlined, RefreshOutlined,
  AttachMoneyOutlined, PercentOutlined,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { KPICard } from '../../components/common/KPICard';
import { RevenueLineChart } from '../../components/charts/RevenueLineChart';
import { BarChart } from '../../components/charts/BarChart';
import { DonutChart } from '../../components/charts/DonutChart';
import { HeatmapChart } from '../../components/charts/HeatmapChart';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingState, ChartSkeleton } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import {
  useOverviewKPIs, useRevenueTrend, useTopProducts,
  useCustomerAnalytics, useInsights, useHeatmap,
} from './hooks/useAnalytics';
import { formatCurrency, formatCompactNumber, trendLabel } from '../../utils/formatters';
import { SEGMENT_COLORS, SEVERITY_COLORS } from '../../styles/theme';
import { Granularity } from '../../types';

const PERIOD_OPTIONS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
];

const getDateRange = (days: number) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

export const OverviewDashboard = () => {
  const [period, setPeriod] = useState(30);
  const [granularity, setGranularity] = useState<Granularity>('day');
  const qc = useQueryClient();

  const { startDate, endDate } = getDateRange(period);

  const kpis = useOverviewKPIs(startDate, endDate);
  const trend = useRevenueTrend(granularity, startDate, endDate);
  const topProducts = useTopProducts(8, startDate, endDate);
  const customers = useCustomerAnalytics();
  const insights = useInsights();
  const heatmap = useHeatmap(startDate, endDate);

  const k = kpis.data?.kpis;

  const trendChartData = trend.data?.trend.map((d) => ({
    ...d,
    label: trendLabel(d, granularity),
  })) ?? [];

  const segmentData = customers.data?.segmentDistribution.map((s) => ({
    name: s._id.charAt(0).toUpperCase() + s._id.slice(1),
    value: s.count,
    color: SEGMENT_COLORS[s._id],
  })) ?? [];

  const categoryData = trend.data?.categoryBreakdown.map((c) => ({
    name: c._id || 'Unknown',
    value: c.revenue,
  })) ?? [];

  const topProductsData = topProducts.data?.map((p) => ({
    name: p.productName.length > 20 ? p.productName.slice(0, 20) + '…' : p.productName,
    value: p.revenue,
    Profit: p.profit,
  })) ?? [];

  return (
    <Box>
      <PageHeader
        title="Business Overview"
        subtitle="AI-powered insights into your business performance"
        breadcrumbs={[{ label: 'Dashboard' }]}
        actions={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <ToggleButtonGroup value={period} exclusive onChange={(_, v) => v && setPeriod(v)} size="small">
              {PERIOD_OPTIONS.map((o) => (
                <ToggleButton key={o.days} value={o.days} sx={{ px: 1.5, fontSize: 12 }}>{o.label}</ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={() => qc.invalidateQueries({ queryKey: ['analytics'] })}>
                <RefreshOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />

      {/* AI Insights banner */}
      {insights.data && insights.data.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <AnimatePresence>
            {insights.data.slice(0, 3).map((ins, i) => (
              <motion.div key={ins.type} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Alert
                  severity={ins.severity}
                  sx={{ mb: 1, borderRadius: 2 }}
                  action={ins.actionUrl && (
                    <Chip label="View" size="small" variant="outlined" component="a" href={ins.actionUrl} clickable />
                  )}
                >
                  <AlertTitle sx={{ fontWeight: 600 }}>{ins.title}</AlertTitle>
                  {ins.message} <Typography component="span" variant="caption" color="inherit" sx={{ opacity: 0.8 }}>— {ins.recommendation}</Typography>
                </Alert>
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Total Revenue', value: k?.revenue.value ?? 0, growth: k?.revenue.growth, icon: <AttachMoneyOutlined fontSize="small" /> },
          { title: 'Gross Profit', value: k?.grossProfit.value ?? 0, growth: k?.grossProfit.growth, icon: <TrendingUpOutlined fontSize="small" />, color: '#10B981' },
          { title: 'Net Profit', value: k?.netProfit.value ?? 0, growth: k?.netProfit.growth, icon: <TrendingUpOutlined fontSize="small" />, color: '#7C3AED' },
          { title: 'Expenses', value: k?.expenses.value ?? 0, growth: k?.expenses.growth, icon: <AccountBalanceWalletOutlined fontSize="small" />, color: '#EF4444' },
          { title: 'Total Orders', value: k?.orders.value ?? 0, growth: k?.orders.growth, icon: <ShoppingCartOutlined fontSize="small" />, isCurrency: false },
          { title: 'Avg Order Value', value: k?.avgOrderValue.value ?? 0, growth: k?.avgOrderValue.growth, icon: <ShoppingCartOutlined fontSize="small" />, color: '#F59E0B' },
          { title: 'Customers', value: k?.customers.value ?? 0, growth: k?.customers.growth, icon: <PeopleOutlined fontSize="small" />, isCurrency: false, subtitle: `+${k?.customers.newThisPeriod ?? 0} new` },
          { title: 'Profit Margin', value: k?.profitMargin.value ?? 0, icon: <PercentOutlined fontSize="small" />, color: '#0EA5E9', isPercent: true },
        ].map((card, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <KPICard {...card} isLoading={kpis.isLoading} />
          </Grid>
        ))}
      </Grid>

      {/* Revenue Trend */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardHeader
              title="Revenue & Profit Trend"
              titleTypographyProps={{ variant: 'h6' }}
              action={
                <ToggleButtonGroup value={granularity} exclusive onChange={(_, v) => v && setGranularity(v)} size="small">
                  {(['day', 'week', 'month'] as Granularity[]).map((g) => (
                    <ToggleButton key={g} value={g} sx={{ px: 1.2, fontSize: 11 }}>{g[0].toUpperCase() + g.slice(1)}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
              }
            />
            <CardContent>
              {trend.isLoading ? <ChartSkeleton height={280} /> :
               trend.isError ? <ErrorState onRetry={() => trend.refetch()} /> :
               trendChartData.length === 0 ? <EmptyState title="No sales data" description="Import sales data to see trend." /> :
               <RevenueLineChart data={trend.data!.trend} granularity={granularity} height={280} />}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Revenue by Category" titleTypographyProps={{ variant: 'h6' }} />
            <CardContent>
              {trend.isLoading ? <ChartSkeleton height={280} /> :
               categoryData.length === 0 ? <EmptyState title="No category data" /> :
               <DonutChart
                 data={categoryData}
                 height={280}
                 isCurrency
                 centerLabel="Top Category"
                 centerValue={categoryData[0]?.name ?? ''}
               />}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Products + Customer Segments */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardHeader title="Top Products by Revenue" titleTypographyProps={{ variant: 'h6' }} />
            <CardContent>
              {topProducts.isLoading ? <ChartSkeleton height={240} /> :
               topProductsData.length === 0 ? <EmptyState title="No product data" /> :
               <BarChart data={topProductsData} xAxisKey="name" dataKey="value" secondaryKey="Profit" label="Revenue" secondaryLabel="Profit" height={240} />}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Customer Segments" titleTypographyProps={{ variant: 'h6' }} />
            <CardContent>
              {customers.isLoading ? <LoadingState height={240} /> :
               segmentData.length === 0 ? <EmptyState title="No customer data" /> :
               <DonutChart
                 data={segmentData}
                 height={240}
                 centerLabel="Total"
                 centerValue={formatCompactNumber(customers.data?.totalCustomers ?? 0)}
               />}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sales Heatmap + Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardHeader title="Sales Activity Heatmap" subheader="Orders by day of week & hour" titleTypographyProps={{ variant: 'h6' }} />
            <CardContent>
              {heatmap.isLoading ? <LoadingState height={200} /> :
               (heatmap.data?.length ?? 0) === 0 ? <EmptyState title="No heatmap data" /> :
               <HeatmapChart data={heatmap.data!} />}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Customer Health" titleTypographyProps={{ variant: 'h6' }} />
            <CardContent>
              {customers.isLoading ? <LoadingState height={200} /> : customers.data && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    { label: 'Retention Rate', value: customers.data.retentionRate, max: 100, color: 'success.main', fmt: (v: number) => `${v.toFixed(1)}%` },
                    { label: 'At-Risk Customers', value: customers.data.atRiskCount, max: customers.data.totalCustomers, color: 'warning.main', fmt: (v: number) => v.toString() },
                    { label: 'Churned Customers', value: customers.data.churnedCount, max: customers.data.totalCustomers, color: 'error.main', fmt: (v: number) => v.toString() },
                  ].map((stat) => (
                    <Box key={stat.label}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                        <Typography variant="body2" fontWeight={600}>{stat.fmt(stat.value)}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={stat.max > 0 ? Math.min((stat.value / stat.max) * 100, 100) : 0}
                        sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: stat.color } }}
                      />
                    </Box>
                  ))}

                  <Divider sx={{ my: 1 }} />

                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>Top Customers</Typography>
                    {customers.data.topCustomers.slice(0, 4).map((c) => (
                      <Box key={c._id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>{c.firstName} {c.lastName}</Typography>
                          <Chip label={c.segment} size="small" sx={{ height: 18, fontSize: 10, bgcolor: `${SEGMENT_COLORS[c.segment]}22`, color: SEGMENT_COLORS[c.segment] }} />
                        </Box>
                        <Typography variant="body2" fontWeight={600}>{formatCurrency(c.metrics.totalRevenue)}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Channel breakdown table */}
      {trend.data?.channelBreakdown && trend.data.channelBreakdown.length > 0 && (
        <Card>
          <CardHeader title="Sales by Channel" titleTypographyProps={{ variant: 'h6' }} />
          <CardContent sx={{ pt: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Channel</TableCell>
                  <TableCell align="right">Revenue</TableCell>
                  <TableCell align="right">Orders</TableCell>
                  <TableCell align="right">Avg Order Value</TableCell>
                  <TableCell align="right">Share</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trend.data.channelBreakdown.map((ch) => {
                  const total = trend.data!.channelBreakdown.reduce((s, c) => s + c.revenue, 0);
                  const share = total > 0 ? (ch.revenue / total) * 100 : 0;
                  return (
                    <TableRow key={ch._id}>
                      <TableCell>
                        <Typography variant="body2" textTransform="capitalize">{ch._id || 'Unknown'}</Typography>
                      </TableCell>
                      <TableCell align="right"><Typography variant="body2" fontWeight={600}>{formatCurrency(ch.revenue)}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2">{ch.orders.toLocaleString()}</Typography></TableCell>
                      <TableCell align="right"><Typography variant="body2">{formatCurrency(ch.avgOrderValue)}</Typography></TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                          <LinearProgress variant="determinate" value={share} sx={{ width: 60, height: 4, borderRadius: 2 }} />
                          <Typography variant="caption">{share.toFixed(1)}%</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
