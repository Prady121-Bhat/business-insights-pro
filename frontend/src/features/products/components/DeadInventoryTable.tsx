import {
  Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Box, Typography, Tooltip, Alert,
} from '@mui/material';
import { BlockOutlined } from '@mui/icons-material';
import { formatCurrency, formatRelativeTime } from '../../../utils/formatters';
import { EmptyState } from '../../../components/common/EmptyState';

interface Product {
  _id: string;
  name: string;
  sku: string;
  category: string;
  inventory: { currentStock: number };
  pricing: { costPrice: number; sellingPrice: number };
  metrics?: { lastSoldAt?: string; totalSold: number; turnoverRate: number };
}

interface Props {
  products: Product[];
}

export const DeadInventoryTable = ({ products }: Props) => {
  if (!products?.length) return (
    <EmptyState
      title="No dead inventory"
      description="All stocked products have recent sales activity."
      icon={<BlockOutlined sx={{ fontSize: 40, color: 'success.main' }} />}
    />
  );

  const totalCostValue = products.reduce(
    (s, p) => s + p.inventory.currentStock * (p.pricing?.costPrice ?? 0),
    0
  );

  return (
    <Box>
      <Alert severity="warning" sx={{ mb: 2 }}>
        Dead inventory ties up <strong>{formatCurrency(totalCostValue)}</strong> in capital across {products.length} SKUs with no sales in 90 days. Consider markdowns, bundles, or liquidation.
      </Alert>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Product</TableCell>
            <TableCell>Category</TableCell>
            <TableCell align="right">Stock</TableCell>
            <TableCell>Last Sold</TableCell>
            <TableCell align="right">Cost Value</TableCell>
            <TableCell align="right">Retail Value</TableCell>
            <TableCell align="right">Turnover</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map((p) => {
            const costValue = p.inventory.currentStock * (p.pricing?.costPrice ?? 0);
            const retailValue = p.inventory.currentStock * (p.pricing?.sellingPrice ?? 0);

            return (
              <TableRow key={p._id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BlockOutlined sx={{ fontSize: 14, color: 'text.disabled' }} />
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
                  <Typography variant="body2" fontWeight={600}>{p.inventory.currentStock}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {p.metrics?.lastSoldAt ? formatRelativeTime(p.metrics.lastSoldAt) : 'Never'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="error.main" fontWeight={600}>
                    {formatCurrency(costValue)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{formatCurrency(retailValue)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Inventory turnover rate (90 days)">
                    <Typography variant="body2" color="text.secondary">
                      {(p.metrics?.turnoverRate ?? 0).toFixed(2)}x
                    </Typography>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
};
