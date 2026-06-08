import { useState } from 'react';
import {
  Grid, Card, CardContent, Box, Typography, Button, Chip, Alert,
  Select, MenuItem, FormControl, InputLabel, Slider, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, Tooltip,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  AutoGraphOutlined, PlayArrowOutlined, InfoOutlined,
  TrendingUpOutlined, TrendingDownOutlined, TrendingFlatOutlined,
  CheckCircleOutlined, ErrorOutlined,
} from '@mui/icons-material';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { KPICard } from '../../components/common/KPICard';
import { ForecastChart } from './components/ForecastChart';
import {
  useGenerateForecast, useAnalyticsServiceHealth, useSavedForecasts,
} from './hooks/useForecasting';
import { formatCurrency, formatCompactNumber } from '../../utils/formatters';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { showSnackbar } from '../../app/uiSlice';

const METRIC_OPTIONS = [
  { value: 'revenue', label: 'Revenue', isCurrency: true },
  { value: 'sales_volume', label: 'Sales Volume', isCurrency: false },
  { value: 'demand', label: 'Unit Demand', isCurrency: false },
  { value: 'customer_growth', label: 'Customer Growth', isCurrency: false },
  { value: 'expenses', label: 'Expenses', isCurrency: true },
];

const ALGORITHM_OPTIONS = [
  { value: 'ensemble', label: 'Ensemble (Recommended)', desc: 'Combines all algorithms with weighted voting for best accuracy' },
  { value: 'linear_regression', label: 'Linear Regression', desc: 'Best for steady growth trends with little noise' },
  { value: 'exponential_smoothing', label: 'Exponential Smoothing', desc: 'Best for recent-trend-driven data with dampening' },
  { value: 'moving_average', label: 'Moving Average', desc: 'Best for stable data with moderate variance' },
];

const TREND_ICON: Record<string, JSX.Element> = {
  up: <TrendingUpOutlined sx={{ color: 'success.main', fontSize: 18 }} />,
  down: <TrendingDownOutlined sx={{ color: 'error.main', fontSize: 18 }} />,
  flat: <TrendingFlatOutlined sx={{ color: 'text.secondary', fontSize: 18 }} />,
};

const ALGO_LABEL: Record<string, string> = {
  linear_regression: 'Linear Regression',
  moving_average: 'Moving Average',
  exponential_smoothing: 'Exp. Smoothing',
  ensemble: 'Ensemble',
};

export const ForecastingPage = () => {
  const dispatch = useAppDispatch();
  const [metric, setMetric] = useState('revenue');
  const [algorithm, setAlgorithm] = useState('ensemble');
  const [granularity, setGranularity] = useState<'month' | 'week'>('month');
  const [periods, setPeriods] = useState(6);
  const [result, setResult] = useState<any>(null);

  const generate = useGenerateForecast();
  const health = useAnalyticsServiceHealth();
  const saved = useSavedForecasts();
  const serviceOnline = health.data?.analyticsServiceOnline;

  const selectedMetric = METRIC_OPTIONS.find((m) => m.value === metric);
  const isCurrency = selectedMetric?.isCurrency ?? true;

  const handleGenerate = async () => {
    try {
      const data = await generate.mutateAsync({ metric, algorithm, granularity, periods });
      setResult(data);
      dispatch(showSnackbar({ message: 'Forecast generated successfully', severity: 'success' }));
    } catch (e: any) {
      dispatch(showSnackbar({ message: e.message ?? 'Forecast failed', severity: 'error' }));
    }
  };

  const fmtVal = (v: number) => isCurrency ? formatCurrency(v) : formatCompactNumber(v);

  return (
    <Box>
      <PageHeader
        title="Forecasting"
        subtitle="AI-powered predictions using Linear Regression, Exponential Smoothing and Ensemble methods"
        breadcrumbs={[{ label: 'Forecasting' }]}
      />

      {/* Service status */}
      {!health.isLoading && (
        <Alert
          severity={serviceOnline ? 'success' : 'warning'}
          icon={serviceOnline ? <CheckCircleOutlined /> : <ErrorOutlined />}
          sx={{ mb: 2 }}
        >
          {serviceOnline
            ? 'Analytics service online — all forecasting algorithms available.'
            : 'Analytics service offline. Check that the Python service is running on port 8001.'}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Configuration panel */}
        <Grid item xs={12} md={3}>
          <Card sx={{ position: { md: 'sticky' }, top: 16 }}>
            <CardContent>
              <Typography variant="h6" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoGraphOutlined fontSize="small" />
                Configure
              </Typography>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Metric</InputLabel>
                <Select value={metric} label="Metric" onChange={(e) => setMetric(e.target.value)}>
                  {METRIC_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Algorithm</InputLabel>
                <Select value={algorithm} label="Algorithm" onChange={(e) => setAlgorithm(e.target.value)}>
                  {ALGORITHM_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      <Box>
                        <Typography variant="body2">{o.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{o.desc}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" mb={1}>Granularity</Typography>
                <ToggleButtonGroup
                  value={granularity}
                  exclusive
                  onChange={(_, v) => v && setGranularity(v)}
                  fullWidth
                  size="small"
                >
                  <ToggleButton value="month">Monthly</ToggleButton>
                  <ToggleButton value="week">Weekly</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Forecast Periods: <strong>{periods}</strong>
                </Typography>
                <Slider
                  value={periods}
                  onChange={(_, v) => setPeriods(v as number)}
                  min={1}
                  max={24}
                  step={1}
                  marks={[{ value: 3, label: '3' }, { value: 12, label: '12' }, { value: 24, label: '24' }]}
                  size="small"
                />
              </Box>

              <Button
                fullWidth
                variant="contained"
                startIcon={<PlayArrowOutlined />}
                onClick={handleGenerate}
                disabled={generate.isPending || !serviceOnline}
                size="large"
              >
                {generate.isPending ? 'Generating…' : 'Generate Forecast'}
              </Button>

              {algorithm !== 'ensemble' && (
                <Alert severity="info" sx={{ mt: 2, fontSize: 11 }} icon={<InfoOutlined sx={{ fontSize: 16 }} />}>
                  Ensemble is recommended for most use cases.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Results panel */}
        <Grid item xs={12} md={9}>
          {generate.isPending && <LoadingState />}

          {!generate.isPending && !result && (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <AutoGraphOutlined sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">Configure and run a forecast</Typography>
                <Typography variant="body2" color="text.disabled">
                  Select a metric, algorithm and period count, then click Generate Forecast.
                </Typography>
              </CardContent>
            </Card>
          )}

          {result && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* KPIs */}
              <Grid container spacing={2}>
                {[
                  {
                    title: 'Next Period Forecast',
                    value: result.summary.next_period_forecast,
                    isCurrency,
                    color: '#3B82F6',
                  },
                  {
                    title: `${periods}-Period Total`,
                    value: result.summary.period_total_forecast,
                    isCurrency,
                    color: '#10B981',
                  },
                  {
                    title: 'Growth vs Last',
                    value: Math.abs(result.summary.growth_vs_last),
                    isPercent: true,
                    isCurrency: false,
                    color: result.summary.growth_vs_last >= 0 ? '#10B981' : '#EF4444',
                    prefix: result.summary.growth_vs_last >= 0 ? '+' : '-',
                  },
                  {
                    title: 'Avg Forecast',
                    value: result.summary.avg_forecast,
                    isCurrency,
                  },
                ].map((kpi, i) => (
                  <Grid item xs={6} sm={3} key={i}>
                    <KPICard {...kpi} isLoading={false} />
                  </Grid>
                ))}
              </Grid>

              {/* Chart */}
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">
                        {METRIC_OPTIONS.find((m) => m.value === metric)?.label} Forecast
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {result.historical.length} historical points · {result.forecast.length} forecast periods
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip label={ALGO_LABEL[result.metadata.algorithm_used] ?? result.metadata.algorithm_used} size="small" color="primary" variant="outlined" />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {TREND_ICON[result.metadata.trend_direction]}
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                          {result.metadata.trend_direction} trend
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <ForecastChart
                    historical={result.historical}
                    forecast={result.forecast}
                    metric={metric}
                    height={360}
                  />
                </CardContent>
              </Card>

              {/* Model Quality + Forecast Table */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" mb={2}>Model Quality</Typography>
                      {[
                        { label: 'Algorithm', value: ALGO_LABEL[result.metadata.algorithm_used] },
                        { label: 'Data Points Used', value: result.metadata.data_points_used },
                        { label: 'MAE', value: fmtVal(result.metadata.mae) },
                        { label: 'RMSE', value: fmtVal(result.metadata.rmse) },
                        result.metadata.mape !== null && { label: 'MAPE', value: `${result.metadata.mape?.toFixed(1)}%` },
                        result.metadata.r_squared !== null && { label: 'R² Score', value: result.metadata.r_squared?.toFixed(4) },
                        { label: 'Trend Direction', value: result.metadata.trend_direction.toUpperCase() },
                        { label: 'Trend Strength', value: `${(result.metadata.trend_strength * 100).toFixed(0)}%` },
                        { label: 'Seasonality', value: result.metadata.seasonality_detected ? 'Detected' : 'None' },
                      ].filter(Boolean).map((row: any) => (
                        <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                          <Typography variant="body2" fontWeight={600}>{row.value}</Typography>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" mb={2}>Forecast Detail</Typography>
                      <Box sx={{ maxHeight: 340, overflowY: 'auto' }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>Period</TableCell>
                              <TableCell align="right">Predicted</TableCell>
                              <TableCell align="right">Lower (95%)</TableCell>
                              <TableCell align="right">Upper (95%)</TableCell>
                              <TableCell align="right">Range</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {result.forecast.map((p: any, i: number) => (
                              <TableRow key={p.date} hover>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={500}>{p.date}</Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight={700} color="primary.main">
                                    {fmtVal(p.predicted)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" color="text.secondary">{fmtVal(p.lower)}</Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" color="text.secondary">{fmtVal(p.upper)}</Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="caption" color="text.disabled">
                                    ±{fmtVal((p.upper - p.lower) / 2)}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Saved forecasts history */}
          {!generate.isPending && saved.data?.length > 0 && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" mb={2}>Previous Forecasts</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell>Algorithm</TableCell>
                      <TableCell>Granularity</TableCell>
                      <TableCell>Periods</TableCell>
                      <TableCell>Generated</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(saved.data ?? []).slice(0, 10).map((f: any) => (
                      <TableRow key={f._id} hover>
                        <TableCell>
                          <Chip label={f.metric} size="small" variant="outlined" sx={{ textTransform: 'capitalize', fontSize: 11 }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{ALGO_LABEL[f.algorithm] ?? f.algorithm}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{f.granularity}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{f.periods}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(f.generatedAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};
