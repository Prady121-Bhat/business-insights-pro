import {
  AreaChart as RechartsAreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useTheme, Box, Typography } from '@mui/material';
import { formatCompactNumber, formatCurrency } from '../../utils/formatters';

interface Props {
  data: Array<{ label: string; value: number; value2?: number }>;
  height?: number;
  isCurrency?: boolean;
  color?: string;
  label?: string;
}

export const AreaChart = ({ data, height = 200, isCurrency = true, color, label }: Props) => {
  const theme = useTheme();
  const fill = color || theme.palette.primary.main;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={fill} stopOpacity={0.2} />
            <stop offset="95%" stopColor={fill} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v) => isCurrency ? formatCompactNumber(v) : v.toLocaleString()}
          tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
          tickLine={false}
          axisLine={false}
          width={50}
        />
        <Tooltip
          formatter={(v: number) => [isCurrency ? formatCurrency(v) : v.toLocaleString(), label || 'Value']}
          contentStyle={{
            background: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Area type="monotone" dataKey="value" stroke={fill} strokeWidth={2} fill="url(#colorArea)" dot={false} />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
};
