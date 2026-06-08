import {
  Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Box, Typography, Alert,
} from '@mui/material';
import { ShoppingCartOutlined, ErrorOutlined, WarningAmberOutlined, InfoOutlined } from '@mui/icons-material';
import { formatCurrency } from '../../../utils/formatters';
import { EmptyState } from '../../../components/common/EmptyState';

interface ReorderItem {
  _id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  urgency: 'critical' | 'high' | 'medium';
  estimatedCost: number;
  daysUntilStockout: number;
  avgMonthlySales: number;
}

const URGENCY_CONFIG = {
  critical: { color: 'error' as const, icon: <ErrorOutlined sx={{ fontSize: 14 }} />, label: 'Critical' },
  high: { color: 'warning' as const, icon: <WarningAmberOutlined sx={{ fontSize: 14 }} />, label: 'High' },
  medium: { color: 'info' as const, icon: <InfoOutlined sx={{ fontSize: 14 }} />, label: 'Medium' },
};

interface Props {
  items: ReorderItem[];
}

export const ReorderRecommendationsPanel = ({ items }: Props) => {
  if (!items?.length) return (
    <EmptyState
      title="No reorder needed"
      description="All products are above their reorder points."
      icon={<ShoppingCartOutlined sx={{ fontSize: 40, color: 'success.main' }} />}
    />
  );

  const totalCost = items.reduce((s, i) => s + i.estimatedCost, 0);
  const critical = items.filter((i) => i.urgency === 'critical').length;

  return (
    <Box>
      {critical > 0 && (
        <Alert severity="error" sx={{ mb: 2 }} icon={<ErrorOutlined />}>
          {critical} product{critical > 1 ? 's' : ''} out of stock — immediate order required.
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {[
          { label: 'Items to Reorder', value: items.length, color: 'text.primary' },
          { label: 'Estimated Total Cost', value: formatCurrency(totalCost), color: 'primary.main' },
          { label: 'Critical', value: items.filter((i) => i.urgency === 'critical').length, color: 'error.main' },
          { label: 'High Priority', value: items.filter((i) => i.urgency === 'high').length, color: 'warning.main' },
        ].map((stat) => (
          <Box key={stat.label} sx={{ bgcolor: 'action.hover', borderRadius: 2, px: 2, py: 1, minWidth: 120 }}>
            <Typography variant="h6" fontWeight={700} color={stat.color}>{stat.value}</Typography>
            <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
          </Box>
        ))}
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Product</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Priority</TableCell>
            <TableCell align="right">Current</TableCell>
            <TableCell align="right">Reorder Pt</TableCell>
            <TableCell align="right">Order Qty</TableCell>
            <TableCell align="right">Days Left</TableCell>
            <TableCell align="right">Est. Cost</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => {
            const cfg = URGENCY_CONFIG[item.urgency];
            return (
              <TableRow key={item._id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>{item.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.sku}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={item.category} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                </TableCell>
                <TableCell>
                  <Chip
                    label={cfg.label}
                    size="small"
                    color={cfg.color}
                    icon={cfg.icon}
                    sx={{ fontSize: 10 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700} color={item.currentStock === 0 ? 'error.main' : 'inherit'}>
                    {item.currentStock}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">{item.reorderPoint}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={600} color="primary.main">{item.suggestedOrderQty}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={item.daysUntilStockout < 7 ? 'error.main' : 'text.primary'}>
                    {item.daysUntilStockout < 9999 ? `${item.daysUntilStockout}d` : '∞'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={500}>{formatCurrency(item.estimatedCost)}</Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
};
