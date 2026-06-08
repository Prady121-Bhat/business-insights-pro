import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme, Box, Typography } from '@mui/material';
import { CHART_COLORS } from '../../styles/theme';
import { formatCurrency, formatCompactNumber } from '../../utils/formatters';

interface DataItem { name: string; value: number; color?: string }

interface Props {
  data: DataItem[];
  height?: number;
  isCurrency?: boolean;
  innerRadius?: number;
  centerLabel?: string;
  centerValue?: string;
}

const CustomTooltip = ({ active, payload, isCurrency }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
      <Typography variant="caption" color="text.secondary">{name}</Typography>
      <Typography variant="body2" fontWeight={600}>
        {isCurrency ? formatCurrency(value) : formatCompactNumber(value)}
      </Typography>
    </Box>
  );
};

export const DonutChart = ({ data, height = 300, isCurrency = false, innerRadius = 60, centerLabel, centerValue }: Props) => {
  const theme = useTheme();

  return (
    <Box sx={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={innerRadius + 40}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip isCurrency={isCurrency} />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => <span style={{ color: theme.palette.text.secondary }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -60%)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          {centerValue && <Typography variant="h6" fontWeight={700}>{centerValue}</Typography>}
          {centerLabel && <Typography variant="caption" color="text.secondary">{centerLabel}</Typography>}
        </Box>
      )}
    </Box>
  );
};
