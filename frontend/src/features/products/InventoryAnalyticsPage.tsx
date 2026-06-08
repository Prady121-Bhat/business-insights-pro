import { useState } from 'react';
import {
  Grid, Card, CardContent, CardHeader, Box, Typography, Button,
  Tab, Tabs, Alert, Divider,
} from '@mui/material';
import {
  RefreshOutlined, Inventory2Outlined, WarningAmberOutlined,
  BlockOutlined, ShoppingCartOutlined, TrendingDownOutlined,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { PageHeader } from '../../components/common/PageHeader';
import { KPICard } from '../../components/common/KPICard';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { BarChart } from '../../components/charts/BarChart';
import { VelocityDistributionChart } from './components/VelocityDistributionChart';
import { LowStockTable } from './components/LowStockTable';
import { ReorderRecommendationsPanel } from './components/ReorderRecommendationsPanel';
import { StockoutPredictionPanel } from './components/StockoutPredictionPanel';
import { DeadInventoryTable } from './components/DeadInventoryTable';
import {
  useInventoryOverview,
  useStockoutPredictions,
  useReorderRecommendations,
  useLowStockAlerts,
  useDeadInventory,
  useComputeInventoryMetrics,
} from './hooks/useProducts';
import { formatCurrency, formatCompactNumber } from '../../utils/formatters';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { showSnackbar } from '../../app/uiSlice';

const TABS = ['Overview', 'Stockout Prediction', 'Reorder Queue', 'Low Stock', 'Dead Inventory'];

const MotionCard = motion(Card);

export const InventoryAnalyticsPage = () => {
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState(0);

  const overview = useInventoryOverview();
  const stockout = useStockoutPredictions();
  const reorder = useReorderRecommendations();
  const lowStock = useLowStockAlerts();
  const dead = useDeadInventory();
  const compute = useComputeInventoryMetrics();

  const handleCompute = async () => {
    try {
      await compute.mutateAsync();
      dispatch(showSnackbar({ message: 'Inventory metrics recalculated', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to recalculate metrics', severity: 'error' }));
    }
  };

  const summary = overview.data?.summary;
  const velocity = overview.data?.velocity ?? [];
  const valuation = overview.data?.valuation ?? [];

  const valuationChartData = valuation.map((v: any) => ({
    name: v._id,
    cost: v.costValue,
    retail: v.retailValue,
  }));

  const kpis = [
    {
      title: 'Total Products',
      value: summary?.totalProducts ?? 0,
      icon: <Inventory2Outlined fontSize="small" />,
      isCurrency: false,
    },
    {
      title: 'Total Stock Value',
      value: summary?.totalCostValue ?? 0,
      icon: <Inventory2Outlined fontSize="small" />,
      isCurrency: true,
    },
    {
      title: 'Out of Stock',
      value: summary?.outOfStock ?? 0,
      icon: <WarningAmberOutlined fontSize="small" />,
      isCurrency: false,
      color: '#EF4444',
    },
    {
      title: 'Low Stock Alerts',
      value: summary?.lowStock ?? 0,
      icon: <WarningAmberOutlined fontSize="small" />,
      isCurrency: false,
      color: '#F59E0B',
    },
    {
      title: 'Dead Inventory Cost',
      value: summary?.deadInventoryCost ?? 0,
      icon: <BlockOutlined fontSize="small" />,
      isCurrency: true,
      color: '#6B7280',
    },
    {
      title: 'Avg Days of Inventory',
      value: summary?.avgDaysOfInventory ? Math.round(summary.avgDaysOfInventory) : 0,
      icon: <TrendingDownOutlined fontSize="small" />,
      isCurrency: false,
      suffix: 'd',
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Inventory Intelligence"
        subtitle="Stock tracking, velocity analysis, stockout prediction and reorder management"
        breadcrumbs={[{ label: 'Analytics' }, { label: 'Inventory' }]}
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshOutlined />}
            onClick={handleCompute}
            disabled={compute.isPending}
            size="small"
          >
            {compute.isPending ? 'Computing…' : 'Recalculate Metrics'}
          </Button>
        }
      />

      {/* Critical alerts banner */}
      {!overview.isLoading && (summary?.outOfStock ?? 0) > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>{summary?.outOfStock} product{summary?.outOfStock !== 1 ? 's' : ''} out of stock</strong> — immediate reorder required.
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((kpi, i) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
            <KPICard {...kpi} isLoading={overview.isLoading} />
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
            {overview.isLoading ? <LoadingState /> : overview.isError ? <ErrorState onRetry={() => overview.refetch()} /> : (
              <Grid container spacing={3}>
                {/* Velocity Distribution */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" mb={2}>Inventory Velocity Distribution</Typography>
                  <VelocityDistributionChart data={velocity} />
                </Grid>

                {/* Valuation by Category */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" mb={2}>Stock Valuation by Category</Typography>
                  {valuation.length > 0 ? (
                    <BarChart
                      data={valuationChartData.map((d: any) => ({ name: d.name, value: d.cost, secondary: d.retail }))}
                      height={250}
                      isCurrency
                      multiColor={false}
                      label="Cost Value"
                    />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                      <Typography color="text.secondary">No category data available</Typography>
                    </Box>
                  )}
                </Grid>

                {/* Summary stats */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {[
                      { label: 'Total Units in Stock', value: formatCompactNumber(summary?.totalUnits ?? 0) },
                      { label: 'Retail Value', value: formatCurrency(summary?.totalRetailValue ?? 0) },
                      { label: 'Cost Value', value: formatCurrency(summary?.totalCostValue ?? 0) },
                      { label: 'Potential Margin', value: formatCurrency((summary?.totalRetailValue ?? 0) - (summary?.totalCostValue ?? 0)) },
                      { label: 'Dead Inventory Units', value: formatCompactNumber(summary?.deadInventoryUnits ?? 0) },
                      { label: 'Avg Turnover Rate', value: `${(summary?.avgTurnoverRate ?? 0).toFixed(2)}x` },
                    ].map((stat) => (
                      <Grid item xs={6} sm={4} md={2} key={stat.label}>
                        <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
                          <Typography variant="subtitle1" fontWeight={700}>{stat.value}</Typography>
                          <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            )}
          </CardContent>
        )}

        {/* Stockout Prediction Tab */}
        {tab === 1 && (
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6">Stockout Predictions (Next 30 Days)</Typography>
                <Typography variant="body2" color="text.secondary">
                  Products at risk of running out based on current sales velocity
                </Typography>
              </Box>
            </Box>
            {stockout.isLoading ? <LoadingState /> : stockout.isError ? <ErrorState onRetry={() => stockout.refetch()} /> : (
              <StockoutPredictionPanel products={stockout.data ?? []} />
            )}
          </CardContent>
        )}

        {/* Reorder Queue Tab */}
        {tab === 2 && (
          <CardContent>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">Reorder Recommendations</Typography>
              <Typography variant="body2" color="text.secondary">
                Products below reorder point with suggested order quantities and estimated costs
              </Typography>
            </Box>
            {reorder.isLoading ? <LoadingState /> : reorder.isError ? <ErrorState onRetry={() => reorder.refetch()} /> : (
              <ReorderRecommendationsPanel items={reorder.data ?? []} />
            )}
          </CardContent>
        )}

        {/* Low Stock Tab */}
        {tab === 3 && (
          <CardContent>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">Low Stock Alerts</Typography>
              <Typography variant="body2" color="text.secondary">
                Products with stock below reorder point (but not yet zero)
              </Typography>
            </Box>
            {lowStock.isLoading ? <LoadingState /> : lowStock.isError ? <ErrorState onRetry={() => lowStock.refetch()} /> : (
              <LowStockTable products={lowStock.data ?? []} />
            )}
          </CardContent>
        )}

        {/* Dead Inventory Tab */}
        {tab === 4 && (
          <CardContent>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">Dead Inventory</Typography>
              <Typography variant="body2" color="text.secondary">
                Products with stock but no sales in the last 90 days — capital at risk
              </Typography>
            </Box>
            {dead.isLoading ? <LoadingState /> : dead.isError ? <ErrorState onRetry={() => dead.refetch()} /> : (
              <DeadInventoryTable products={dead.data ?? []} />
            )}
          </CardContent>
        )}
      </Card>
    </Box>
  );
};
