import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useTheme, Box, Typography } from '@mui/material';
import { TrendDataPoint } from '../../types';
import { formatCurrency, formatCompactNumber, trendLabel } from '../../utils/formatters';

interface Props {
  data: TrendDataPoint[];
  granularity: string;
  height?: number;
  showProfit?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, minWidth: 160 }}>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>{label}</Typography>
      {payload.map((p: any) => (
        <Box key={p.dataKey} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="caption" sx={{ color: p.color }}>● {p.name}</Typography>
          <Typography variant="caption" fontWeight={600}>{formatCurrency(p.value)}</Typography>
        </Box>
      ))}
    </Box>
  );
};

export const RevenueLineChart = ({ data, granularity, height = 300, showProfit = true }: Props) => {
  const theme = useTheme();

  const chartData = data.map((d) => ({
    label: trendLabel(d, granularity),
    Revenue: d.revenue,
    Profit: d.profit,
    Orders: d.orders,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
          tickLine={false}
          axisLine={{ stroke: theme.palette.divider }}
        />
        <YAxis
          tickFormatter={(v) => formatCompactNumber(v)}
          tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
          tickLine={false}
          axisLine={false}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="Revenue"
          stroke={theme.palette.primary.main}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5 }}
        />
        {showProfit && (
          <Line
            type="monotone"
            dataKey="Profit"
            stroke={theme.palette.success.main}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
            strokeDasharray="5 2"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};
