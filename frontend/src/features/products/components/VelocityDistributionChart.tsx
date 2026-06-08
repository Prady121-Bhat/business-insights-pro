import { Box, Typography, useTheme, alpha, Tooltip } from '@mui/material';
import { DonutChart } from '../../../components/charts/DonutChart';
import { formatCurrency, formatCompactNumber } from '../../../utils/formatters';

interface VelocityBucket {
  _id: string;
  count: number;
  totalRevenue: number;
  totalStock: number;
  totalCostValue: number;
}

const VELOCITY_LABELS: Record<string, string> = {
  fast: 'Fast Moving',
  medium: 'Medium Moving',
  slow: 'Slow Moving',
  dead: 'Dead Stock',
};

const VELOCITY_COLORS: Record<string, string> = {
  fast: '#10B981',
  medium: '#3B82F6',
  slow: '#F59E0B',
  dead: '#EF4444',
};

interface Props {
  data: VelocityBucket[];
}

export const VelocityDistributionChart = ({ data }: Props) => {
  const theme = useTheme();
  const total = data.reduce((s, d) => s + d.count, 0);

  const donutData = data.map((d) => ({
    name: VELOCITY_LABELS[d._id] ?? d._id,
    value: d.count,
    color: VELOCITY_COLORS[d._id] ?? '#6B7280',
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
      <Box sx={{ flex: 1, minWidth: 220 }}>
        <DonutChart
          data={donutData}
          height={220}
          centerLabel="Products"
          centerValue={String(total)}
        />
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, justifyContent: 'center' }}>
        {data.map((bucket) => {
          const pct = total > 0 ? (bucket.count / total) * 100 : 0;
          const color = VELOCITY_COLORS[bucket._id] ?? '#6B7280';
          return (
            <Tooltip
              key={bucket._id}
              title={`Revenue: ${formatCurrency(bucket.totalRevenue)} | Stock value: ${formatCurrency(bucket.totalCostValue)}`}
              placement="left"
            >
              <Box sx={{ cursor: 'default' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                    <Typography variant="body2" fontWeight={500}>
                      {VELOCITY_LABELS[bucket._id] ?? bucket._id}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">{bucket.count} SKUs</Typography>
                    <Typography variant="body2" fontWeight={600}>{pct.toFixed(0)}%</Typography>
                  </Box>
                </Box>
                <Box sx={{ height: 6, borderRadius: 3, bgcolor: alpha(color, 0.15), overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                </Box>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
};
