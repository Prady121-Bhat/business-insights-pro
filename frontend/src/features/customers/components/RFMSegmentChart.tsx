import { Box, Card, CardContent, CardHeader, Grid, Typography, Chip, Tooltip, LinearProgress } from '@mui/material';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend } from 'recharts';
import { SEGMENT_COLORS } from '../../../styles/theme';
import { formatCurrency, formatCompactNumber } from '../../../utils/formatters';
import { DonutChart } from '../../../components/charts/DonutChart';
import { LoadingState } from '../../../components/common/LoadingState';
import { EmptyState } from '../../../components/common/EmptyState';

interface RFMSegment {
  _id: string;
  count: number;
  avgRecency: number;
  avgFrequency: number;
  avgMonetary: number;
  totalRevenue: number;
  avgLTV: number;
}

const SEGMENT_LABELS: Record<string, { label: string; description: string }> = {
  vip:     { label: 'VIP',     description: 'High recency, frequency & monetary — top tier customers' },
  loyal:   { label: 'Loyal',   description: 'Frequent buyers with decent recency — nurture carefully' },
  regular: { label: 'Regular', description: 'Average across all dimensions — growth opportunity' },
  new:     { label: 'New',     description: 'Recent first purchase — onboarding critical' },
  at_risk: { label: 'At Risk', description: 'Previously loyal but recency declining — re-engage now' },
  lost:    { label: 'Lost',    description: 'Long inactive, low scores — win-back campaign needed' },
};

interface Props { data: RFMSegment[]; isLoading?: boolean }

export const RFMSegmentChart = ({ data, isLoading }: Props) => {
  if (isLoading) return <LoadingState />;
  if (!data?.length) return <EmptyState title="No RFM data" description="Run RFM analysis to see segments." />;

  const donutData = data.map((s) => ({
    name: SEGMENT_LABELS[s._id]?.label ?? s._id,
    value: s.count,
    color: SEGMENT_COLORS[s._id],
  }));

  const totalCustomers = data.reduce((s, d) => s + d.count, 0);
  const totalRevenue = data.reduce((s, d) => s + d.totalRevenue, 0);

  const radarData = ['avgRecency', 'avgFrequency', 'avgMonetary'].map((key) => ({
    metric: key.replace('avg', '').toUpperCase(),
    ...Object.fromEntries(data.map((s) => [SEGMENT_LABELS[s._id]?.label ?? s._id, (s as any)[key]])),
  }));

  return (
    <Grid container spacing={2}>
      {/* Donut */}
      <Grid item xs={12} md={5}>
        <Card>
          <CardHeader title="Customer Segments" titleTypographyProps={{ variant: 'h6' }} />
          <CardContent>
            <DonutChart
              data={donutData}
              height={260}
              centerLabel="Total"
              centerValue={formatCompactNumber(totalCustomers)}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Segment Cards */}
      <Grid item xs={12} md={7}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="Segment Breakdown" titleTypographyProps={{ variant: 'h6' }} />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {data.map((seg) => {
                const meta = SEGMENT_LABELS[seg._id] ?? { label: seg._id, description: '' };
                const pct = totalCustomers > 0 ? (seg.count / totalCustomers) * 100 : 0;
                const revPct = totalRevenue > 0 ? (seg.totalRevenue / totalRevenue) * 100 : 0;
                return (
                  <Box key={seg._id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: SEGMENT_COLORS[seg._id] }} />
                        <Tooltip title={meta.description} placement="top">
                          <Typography variant="body2" fontWeight={600} sx={{ cursor: 'help' }}>
                            {meta.label}
                          </Typography>
                        </Tooltip>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">{seg.count} ({pct.toFixed(1)}%)</Typography>
                        <Typography variant="caption" fontWeight={600}>{formatCurrency(seg.totalRevenue)}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{ flex: 1, height: 5, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: SEGMENT_COLORS[seg._id] } }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">R:{seg.avgRecency?.toFixed(1) ?? '—'} F:{seg.avgFrequency?.toFixed(1) ?? '—'} M:{seg.avgMonetary?.toFixed(1) ?? '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">Avg LTV: {formatCurrency(seg.avgLTV ?? 0)}</Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
