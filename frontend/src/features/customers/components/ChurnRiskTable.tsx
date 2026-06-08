import {
  Table, TableBody, TableCell, TableHead, TableRow, Chip,
  LinearProgress, Box, Typography, Avatar, Tooltip,
} from '@mui/material';
import { WarningAmberOutlined } from '@mui/icons-material';
import { formatCurrency, formatRelativeTime } from '../../../utils/formatters';
import { EmptyState } from '../../../components/common/EmptyState';

interface ChurnCustomer {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  segment: string;
  metrics: { totalRevenue: number; lastPurchaseDate?: string; totalOrders: number };
  churnRisk: { score: number; level: 'low' | 'medium' | 'high'; predictedChurnDate?: string };
}

const LEVEL_COLOR: Record<string, 'error' | 'warning' | 'success'> = {
  high: 'error', medium: 'warning', low: 'success',
};

interface Props { customers: ChurnCustomer[] }

export const ChurnRiskTable = ({ customers }: Props) => {
  if (!customers?.length) return <EmptyState title="No at-risk customers" description="Great news — no churn risk detected." />;

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Customer</TableCell>
          <TableCell>Segment</TableCell>
          <TableCell align="right">Revenue</TableCell>
          <TableCell>Last Purchase</TableCell>
          <TableCell>Churn Risk</TableCell>
          <TableCell align="right">Score</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {customers.map((c) => (
          <TableRow key={c._id} hover>
            <TableCell>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: 'primary.main' }}>
                  {c.firstName[0]}{c.lastName[0]}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={500}>{c.firstName} {c.lastName}</Typography>
                  {c.email && <Typography variant="caption" color="text.secondary">{c.email}</Typography>}
                </Box>
              </Box>
            </TableCell>
            <TableCell>
              <Chip label={c.segment} size="small" variant="outlined" sx={{ textTransform: 'capitalize', fontSize: 11 }} />
            </TableCell>
            <TableCell align="right">
              <Typography variant="body2" fontWeight={600}>{formatCurrency(c.metrics.totalRevenue)}</Typography>
            </TableCell>
            <TableCell>
              <Typography variant="body2" color="text.secondary">
                {c.metrics.lastPurchaseDate ? formatRelativeTime(c.metrics.lastPurchaseDate) : '—'}
              </Typography>
            </TableCell>
            <TableCell>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 120 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Chip
                    label={c.churnRisk.level.toUpperCase()}
                    size="small"
                    color={LEVEL_COLOR[c.churnRisk.level]}
                    sx={{ fontSize: 10, height: 20 }}
                    icon={c.churnRisk.level === 'high' ? <WarningAmberOutlined sx={{ fontSize: '14px !important' }} /> : undefined}
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={c.churnRisk.score}
                  color={LEVEL_COLOR[c.churnRisk.level]}
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </Box>
            </TableCell>
            <TableCell align="right">
              <Typography variant="body2" fontWeight={700} color={`${LEVEL_COLOR[c.churnRisk.level]}.main`}>
                {c.churnRisk.score}
              </Typography>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
