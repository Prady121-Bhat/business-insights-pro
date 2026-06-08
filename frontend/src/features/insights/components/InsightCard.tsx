import { Box, Card, CardContent, Chip, Typography, Button, useTheme, alpha } from '@mui/material';
import {
  ErrorOutlined, WarningAmberOutlined, CheckCircleOutlined, InfoOutlined,
  TrendingUpOutlined, Inventory2Outlined, PeopleOutlined, AttachMoneyOutlined,
  AutoGraphOutlined, SettingsOutlined, ArrowForwardOutlined,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatCompactNumber } from '../../../utils/formatters';

interface Insight {
  type: string;
  category: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  metric?: number;
  metricLabel?: string;
  recommendation: string;
  actionUrl?: string;
  impact?: 'high' | 'medium' | 'low';
}

const SEVERITY_CONFIG = {
  error: { color: '#EF4444', bg: '#FEF2F2', icon: <ErrorOutlined sx={{ fontSize: 20 }} />, label: 'Critical' },
  warning: { color: '#F59E0B', bg: '#FFFBEB', icon: <WarningAmberOutlined sx={{ fontSize: 20 }} />, label: 'Warning' },
  success: { color: '#10B981', bg: '#F0FDF4', icon: <CheckCircleOutlined sx={{ fontSize: 20 }} />, label: 'Positive' },
  info: { color: '#3B82F6', bg: '#EFF6FF', icon: <InfoOutlined sx={{ fontSize: 20 }} />, label: 'Info' },
};

const CATEGORY_ICON: Record<string, JSX.Element> = {
  revenue: <TrendingUpOutlined sx={{ fontSize: 14 }} />,
  inventory: <Inventory2Outlined sx={{ fontSize: 14 }} />,
  customers: <PeopleOutlined sx={{ fontSize: 14 }} />,
  expenses: <AttachMoneyOutlined sx={{ fontSize: 14 }} />,
  growth: <AutoGraphOutlined sx={{ fontSize: 14 }} />,
  operations: <SettingsOutlined sx={{ fontSize: 14 }} />,
};

const IMPACT_COLOR = { high: 'error', medium: 'warning', low: 'default' } as const;

const CURRENCY_METRICS = new Set(['revenue', 'expenses', 'Net Profit', 'Dead Inventory Value', 'Top Product Revenue', 'At-Risk Revenue']);

const isCurrencyMetric = (label?: string, metric?: number) => {
  if (!label) return false;
  if (CURRENCY_METRICS.has(label)) return true;
  if (label?.toLowerCase().includes('revenue') || label?.toLowerCase().includes('cost') || label?.toLowerCase().includes('value')) return true;
  return false;
};

const formatMetric = (metric: number, label?: string) => {
  if (isCurrencyMetric(label)) return formatCurrency(Math.abs(metric));
  if (label?.includes('%') || label?.toLowerCase().includes('rate') || label?.toLowerCase().includes('margin') || label?.toLowerCase().includes('ratio') || label?.toLowerCase().includes('concentration')) return `${Math.abs(metric).toFixed(1)}%`;
  return formatCompactNumber(Math.abs(metric));
};

const MotionCard = motion(Card);

interface Props {
  insight: Insight;
  index: number;
}

export const InsightCard = ({ insight, index }: Props) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const cfg = SEVERITY_CONFIG[insight.severity];

  return (
    <MotionCard
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      variant="outlined"
      sx={{
        borderLeftWidth: 4,
        borderLeftColor: cfg.color,
        borderLeftStyle: 'solid',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
      }}
    >
      <CardContent sx={{ pb: '16px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
              <Box sx={{ color: cfg.color, display: 'flex', alignItems: 'center' }}>{cfg.icon}</Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>{insight.title}</Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
                <Chip
                  label={insight.category}
                  size="small"
                  icon={CATEGORY_ICON[insight.category]}
                  variant="outlined"
                  sx={{ fontSize: 10, textTransform: 'capitalize', height: 22 }}
                />
                {insight.impact && (
                  <Chip
                    label={`${insight.impact} impact`}
                    size="small"
                    color={IMPACT_COLOR[insight.impact]}
                    variant="outlined"
                    sx={{ fontSize: 10, height: 22 }}
                  />
                )}
              </Box>
            </Box>

            {/* Message */}
            <Typography variant="body2" color="text.secondary" mb={1.5}>{insight.message}</Typography>

            {/* Recommendation */}
            <Box sx={{ bgcolor: alpha(cfg.color, 0.06), borderRadius: 1.5, p: 1.25, mb: insight.actionUrl ? 1.5 : 0 }}>
              <Typography variant="caption" fontWeight={700} color={cfg.color} display="block" mb={0.25}>
                Recommendation
              </Typography>
              <Typography variant="body2" color="text.primary">{insight.recommendation}</Typography>
            </Box>

            {/* Action */}
            {insight.actionUrl && (
              <Button
                size="small"
                endIcon={<ArrowForwardOutlined />}
                onClick={() => navigate(insight.actionUrl!)}
                sx={{ color: cfg.color, p: 0, '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}
              >
                View Details
              </Button>
            )}
          </Box>

          {/* Metric badge */}
          {insight.metric !== undefined && (
            <Box sx={{
              bgcolor: alpha(cfg.color, 0.1),
              border: `1px solid ${alpha(cfg.color, 0.25)}`,
              borderRadius: 2,
              p: 1.5,
              textAlign: 'center',
              minWidth: 90,
              flexShrink: 0,
            }}>
              <Typography variant="h6" fontWeight={800} color={cfg.color} lineHeight={1}>
                {formatMetric(insight.metric, insight.metricLabel)}
              </Typography>
              {insight.metricLabel && (
                <Typography variant="caption" color="text.secondary" display="block" mt={0.25} lineHeight={1.2}>
                  {insight.metricLabel}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </CardContent>
    </MotionCard>
  );
};
