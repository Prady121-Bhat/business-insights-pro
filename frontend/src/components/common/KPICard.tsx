import { Card, CardContent, Typography, Box, Skeleton, Tooltip } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat, InfoOutlined } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { formatCurrency, formatCompactNumber, formatPercent } from '../../utils/formatters';

interface Props {
  title: string;
  value: number;
  previousValue?: number;
  growth?: number;
  isCurrency?: boolean;
  isPercent?: boolean;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  color?: string;
  isLoading?: boolean;
  tooltip?: string;
  subtitle?: string;
}

const GrowthBadge = ({ growth }: { growth: number }) => {
  const positive = growth >= 0;
  const Icon = growth > 1 ? TrendingUp : growth < -1 ? TrendingDown : TrendingFlat;
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.3,
      px: 0.8, py: 0.3, borderRadius: 1,
      bgcolor: positive ? 'success.main' : 'error.main',
      color: '#fff', fontSize: 11, fontWeight: 600,
    }}>
      <Icon sx={{ fontSize: 14 }} />
      {Math.abs(growth).toFixed(1)}%
    </Box>
  );
};

export const KPICard = ({
  title, value, previousValue, growth, isCurrency = true, isPercent = false,
  prefix, suffix, icon, color, isLoading = false, tooltip, subtitle,
}: Props) => {
  const displayValue = () => {
    if (isPercent) return `${value.toFixed(1)}%`;
    if (isCurrency) return formatCurrency(value);
    return formatCompactNumber(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="80%" height={48} />
          <Skeleton variant="text" width="40%" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {title}
              </Typography>
              {tooltip && (
                <Tooltip title={tooltip} placement="top">
                  <InfoOutlined sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
                </Tooltip>
              )}
            </Box>
            {icon && (
              <Box sx={{
                p: 1, borderRadius: 2,
                bgcolor: color ? `${color}18` : 'primary.main',
                color: color || 'primary.main',
                display: 'flex', alignItems: 'center',
              }}>
                {icon}
              </Box>
            )}
          </Box>

          <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mb: 0.5, lineHeight: 1.2 }}>
            {prefix}{displayValue()}{suffix}
          </Typography>

          {subtitle && (
            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
          )}

          {growth !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <GrowthBadge growth={growth} />
              <Typography variant="caption" color="text.secondary">vs previous period</Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
