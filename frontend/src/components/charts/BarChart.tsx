import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { useTheme, Box, Typography } from '@mui/material';
import { formatCurrency, formatCompactNumber } from '../../utils/formatters';
import { CHART_COLORS } from '../../styles/theme';

interface DataItem { name: string; value: number; value2?: number; [key: string]: any }

interface Props {
  data: DataItem[];
  dataKey?: string;
  secondaryKey?: string;
  xAxisKey?: string;
  height?: number;
  isCurrency?: boolean;
  multiColor?: boolean;
  label?: string;
  secondaryLabel?: string;
}

const CustomTooltip = ({ active, payload, label, isCurrency }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>{label}</Typography>
      {payload.map((p: any) => (
        <Box key={p.dataKey} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="caption" sx={{ color: p.fill }}>● {p.name}</Typography>
          <Typography variant="caption" fontWeight={600}>
            {isCurrency ? formatCurrency(p.value) : p.value.toLocaleString()}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export const BarChart = ({
  data, dataKey = 'value', secondaryKey, xAxisKey = 'name',
  height = 300, isCurrency = true, multiColor = false, label = 'Value', secondaryLabel,
}: Props) => {
  const theme = useTheme();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
        <XAxis
          dataKey={xAxisKey}
          tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
          tickLine={false}
          axisLine={{ stroke: theme.palette.divider }}
        />
        <YAxis
          tickFormatter={(v) => isCurrency ? formatCompactNumber(v) : v.toLocaleString()}
          tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
          tickLine={false}
          axisLine={false}
          width={55}
        />
        <Tooltip content={<CustomTooltip isCurrency={isCurrency} />} />
        {(secondaryKey) && <Legend wrapperStyle={{ fontSize: 12 }} />}
        <Bar dataKey={dataKey} name={label} fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} maxBarSize={50}>
          {multiColor && data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
        {secondaryKey && (
          <Bar dataKey={secondaryKey} name={secondaryLabel || secondaryKey} fill={theme.palette.success.main} radius={[4, 4, 0, 0]} maxBarSize={50} />
        )}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};
