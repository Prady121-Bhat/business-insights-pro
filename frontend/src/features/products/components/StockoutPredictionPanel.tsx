import { Box, Typography, Card, CardContent, Chip, Tooltip, useTheme, alpha, LinearProgress } from '@mui/material';
import { AccessTimeOutlined, TrendingDownOutlined } from '@mui/icons-material';
import { formatCurrency } from '../../../utils/formatters';
import { EmptyState } from '../../../components/common/EmptyState';

interface StockoutProduct {
  _id: string;
  name: string;
  sku: string;
  category: string;
  inventory: { currentStock: number; reorderPoint: number };
  metrics?: { daysOfInventory: number; averageMonthlySales: number };
  stockoutRisk?: { score: number; predictedStockoutDate?: string };
  pricing: { sellingPrice: number };
}

const getRiskColor = (days: number) => {
  if (days <= 7) return '#EF4444';
  if (days <= 14) return '#F59E0B';
  if (days <= 30) return '#3B82F6';
  return '#10B981';
};

const getRiskLabel = (days: number) => {
  if (days <= 7) return 'Critical';
  if (days <= 14) return 'High';
  if (days <= 30) return 'Medium';
  return 'Low';
};

interface Props {
  products: StockoutProduct[];
}

export const StockoutPredictionPanel = ({ products }: Props) => {
  const theme = useTheme();

  if (!products?.length) return (
    <EmptyState
      title="No stockout risk detected"
      description="All products have sufficient inventory for 30+ days."
      icon={<AccessTimeOutlined sx={{ fontSize: 40, color: 'success.main' }} />}
    />
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {products.map((p) => {
        const days = p.metrics?.daysOfInventory ?? 9999;
        const riskColor = getRiskColor(days);
        const riskLabel = getRiskLabel(days);
        const riskScore = p.stockoutRisk?.score ?? 0;
        const predictedDate = p.stockoutRisk?.predictedStockoutDate
          ? new Date(p.stockoutRisk.predictedStockoutDate).toLocaleDateString()
          : null;

        return (
          <Card key={p._id} variant="outlined" sx={{ borderColor: alpha(riskColor, 0.4) }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{p.name}</Typography>
                    <Chip
                      label={riskLabel}
                      size="small"
                      sx={{ bgcolor: alpha(riskColor, 0.12), color: riskColor, fontSize: 10, height: 18 }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">{p.sku} · {p.category}</Typography>

                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Stockout risk</Typography>
                      <Typography variant="caption" fontWeight={700} color={riskColor}>{riskScore}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={riskScore}
                      sx={{
                        height: 5,
                        borderRadius: 3,
                        bgcolor: alpha(riskColor, 0.15),
                        '& .MuiLinearProgress-bar': { bgcolor: riskColor },
                      }}
                    />
                  </Box>
                </Box>

                <Box sx={{ textAlign: 'right', minWidth: 90 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    <TrendingDownOutlined sx={{ fontSize: 14, color: riskColor }} />
                    <Typography variant="h6" fontWeight={800} color={riskColor}>
                      {days < 9999 ? `${days}d` : '∞'}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">days left</Typography>
                  {predictedDate && (
                    <Tooltip title="Predicted stockout date">
                      <Typography variant="caption" display="block" color="error.main" sx={{ mt: 0.25 }}>
                        ~{predictedDate}
                      </Typography>
                    </Tooltip>
                  )}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mt: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Stock</Typography>
                  <Typography variant="body2" fontWeight={600}>{p.inventory.currentStock} units</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Avg Monthly Sales</Typography>
                  <Typography variant="body2" fontWeight={600}>{Math.round(p.metrics?.averageMonthlySales ?? 0)} units</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Retail Value at Risk</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatCurrency(p.inventory.currentStock * (p.pricing?.sellingPrice ?? 0))}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};
