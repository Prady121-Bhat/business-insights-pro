import {
  Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Box, Typography, LinearProgress, Tooltip,
} from '@mui/material';
import { WarningAmberOutlined, ErrorOutlined } from '@mui/icons-material';
import { EmptyState } from '../../../components/common/EmptyState';
import { formatCurrency } from '../../../utils/formatters';

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: string;
  inventory: { currentStock: number; reorderPoint: number; reorderQuantity: number };
  pricing: { sellingPrice: number; costPrice: number };
  metrics?: { averageMonthlySales: number; daysOfInventory: number };
}

interface Props {
  products: Product[];
  title?: string;
}

export const LowStockTable = ({ products, title }: Props) => {
  if (!products?.length) return (
    <EmptyState
      title={title === 'dead' ? 'No dead inventory' : 'No low stock alerts'}
      description={title === 'dead' ? 'All products have recent sales activity.' : 'All products are above reorder points.'}
    />
  );

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Product</TableCell>
          <TableCell>Category</TableCell>
          <TableCell align="right">Stock</TableCell>
          <TableCell align="right">Reorder Pt</TableCell>
          <TableCell>Stock Level</TableCell>
          <TableCell align="right">Days Left</TableCell>
          <TableCell align="right">Retail Value</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {products.map((p) => {
          const stock = p.inventory.currentStock;
          const reorderPt = p.inventory.reorderPoint;
          const stockPct = reorderPt > 0 ? Math.min(100, (stock / reorderPt) * 100) : 100;
          const isCritical = stock === 0;
          const days = p.metrics?.daysOfInventory;
          const retailValue = stock * (p.pricing?.sellingPrice ?? 0);

          return (
            <TableRow key={p._id} hover sx={{ bgcolor: isCritical ? 'error.50' : 'inherit' }}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isCritical
                    ? <ErrorOutlined sx={{ fontSize: 16, color: 'error.main' }} />
                    : <WarningAmberOutlined sx={{ fontSize: 16, color: 'warning.main' }} />
                  }
                  <Box>
                    <Typography variant="body2" fontWeight={500}>{p.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.sku}</Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Chip label={p.category} size="small" variant="outlined" sx={{ fontSize: 10 }} />
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight={700} color={isCritical ? 'error.main' : 'warning.main'}>
                  {stock}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color="text.secondary">{reorderPt}</Typography>
              </TableCell>
              <TableCell sx={{ minWidth: 100 }}>
                <Tooltip title={`${stockPct.toFixed(0)}% of reorder point`}>
                  <LinearProgress
                    variant="determinate"
                    value={stockPct}
                    color={isCritical ? 'error' : 'warning'}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color={days !== undefined && days < 7 ? 'error.main' : 'text.primary'}>
                  {days !== undefined && days < 9999 ? `${days}d` : '—'}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{formatCurrency(retailValue)}</Typography>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
