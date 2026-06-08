import { Box, Typography, Tooltip, useTheme, alpha } from '@mui/material';
import { formatCompactNumber } from '../../../utils/formatters';
import { EmptyState } from '../../../components/common/EmptyState';

interface CohortRow {
  _id: { cohortYear: number; cohortMonth: number };
  cohortSize: number;
  avgOrders: number;
  avgRevenue: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Props { data: CohortRow[] }

export const CohortTable = ({ data }: Props) => {
  const theme = useTheme();

  if (!data?.length) return <EmptyState title="No cohort data" description="Need at least 2 months of sales data." />;

  const maxSize = Math.max(...data.map((d) => d.cohortSize));
  const maxRevenue = Math.max(...data.map((d) => d.avgRevenue));

  const getIntensity = (value: number, max: number) =>
    max > 0 ? Math.max(0.08, value / max) : 0.08;

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 0.5, minWidth: 500 }}>
        {/* Header */}
        {['Cohort', 'Size', 'Avg Orders', 'Avg Revenue'].map((h) => (
          <Typography key={h} variant="caption" fontWeight={700} color="text.secondary" sx={{ p: 1 }}>{h}</Typography>
        ))}

        {data.map((row) => {
          const label = `${MONTH_NAMES[row._id.cohortMonth - 1]} ${row._id.cohortYear}`;
          return [
            <Typography key={`label-${label}`} variant="body2" fontWeight={600} sx={{ p: 1, whiteSpace: 'nowrap' }}>{label}</Typography>,
            <Tooltip key={`size-${label}`} title={`${row.cohortSize} customers acquired`}>
              <Box sx={{
                p: 1, borderRadius: 1, cursor: 'default',
                bgcolor: alpha(theme.palette.primary.main, getIntensity(row.cohortSize, maxSize)),
                display: 'flex', alignItems: 'center',
              }}>
                <Typography variant="body2" fontWeight={600}>{row.cohortSize}</Typography>
              </Box>
            </Tooltip>,
            <Tooltip key={`orders-${label}`} title={`${row.avgOrders.toFixed(1)} avg orders per customer`}>
              <Box sx={{
                p: 1, borderRadius: 1, cursor: 'default',
                bgcolor: alpha(theme.palette.success.main, getIntensity(row.avgOrders, Math.max(...data.map((d) => d.avgOrders)))),
                display: 'flex', alignItems: 'center',
              }}>
                <Typography variant="body2" fontWeight={600}>{row.avgOrders.toFixed(1)}</Typography>
              </Box>
            </Tooltip>,
            <Tooltip key={`rev-${label}`} title={`$${row.avgRevenue.toFixed(2)} avg revenue per customer`}>
              <Box sx={{
                p: 1, borderRadius: 1, cursor: 'default',
                bgcolor: alpha(theme.palette.warning.main, getIntensity(row.avgRevenue, maxRevenue)),
                display: 'flex', alignItems: 'center',
              }}>
                <Typography variant="body2" fontWeight={600}>${formatCompactNumber(row.avgRevenue)}</Typography>
              </Box>
            </Tooltip>,
          ];
        })}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
        {[
          { color: theme.palette.primary.main, label: 'Cohort Size' },
          { color: theme.palette.success.main, label: 'Avg Orders' },
          { color: theme.palette.warning.main, label: 'Avg Revenue' },
        ].map((item) => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: alpha(item.color, 0.6) }} />
            <Typography variant="caption" color="text.secondary">{item.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
