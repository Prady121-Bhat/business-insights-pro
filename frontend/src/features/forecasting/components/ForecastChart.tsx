import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Box, useTheme, alpha, Typography } from '@mui/material';
import { formatCurrency, formatCompactNumber } from '../../../utils/formatters';

interface DataPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
  is_forecast: boolean;
}

interface Props {
  historical: DataPoint[];
  forecast: DataPoint[];
  metric: string;
  height?: number;
}

const METRIC_IS_CURRENCY: Record<string, boolean> = {
  revenue: true,
  expenses: true,
  demand: false,
  sales_volume: false,
  customer_growth: false,
};

const CustomTooltip = ({ active, payload, label, isCurrency }: any) => {
  if (!active || !payload?.length) return null;
  const isForecast = payload[0]?.payload?.is_forecast;
  const pred = payload.find((p: any) => p.dataKey === 'predicted');
  const lo = payload.find((p: any) => p.dataKey === 'lower');
  const hi = payload.find((p: any) => p.dataKey === 'upper');
  const fmt = (v: number) => isCurrency ? formatCurrency(v) : formatCompactNumber(v);

  return (
    <Box sx={{
      bgcolor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      p: 1.5,
      minWidth: 160,
      boxShadow: 3,
    }}>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        {label} {isForecast ? '(Forecast)' : '(Actual)'}
      </Typography>
      {pred && (
        <Typography variant="body2" fontWeight={700}>
          {isForecast ? 'Predicted: ' : 'Actual: '}{fmt(pred.value)}
        </Typography>
      )}
      {isForecast && lo && hi && (
        <Typography variant="caption" color="text.secondary" display="block">
          Range: {fmt(lo.value)} – {fmt(hi.value)}
        </Typography>
      )}
    </Box>
  );
};

export const ForecastChart = ({ historical, forecast, metric, height = 350 }: Props) => {
  const theme = useTheme();
  const isCurrency = METRIC_IS_CURRENCY[metric] ?? true;

  const splitDate = historical[historical.length - 1]?.date;

  const allData = [
    ...historical.map((h) => ({ ...h, is_forecast: false })),
    ...forecast.map((f) => ({ ...f, is_forecast: true })),
  ];

  const yFmt = (v: number) => isCurrency ? `$${formatCompactNumber(v)}` : formatCompactNumber(v);

  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={allData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.15} />
              <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={theme.palette.warning.main} stopOpacity={0.2} />
              <stop offset="95%" stopColor={theme.palette.warning.main} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={yFmt}
            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
            tickLine={false}
            axisLine={false}
            width={65}
          />
          <Tooltip content={<CustomTooltip isCurrency={isCurrency} />} />
          <Legend
            formatter={(value) => {
              const labels: Record<string, string> = {
                predicted: 'Actual / Predicted',
                upper: 'Upper bound',
                lower: 'Lower bound',
              };
              return labels[value] ?? value;
            }}
            wrapperStyle={{ fontSize: 12 }}
          />

          {splitDate && (
            <ReferenceLine
              x={splitDate}
              stroke={alpha(theme.palette.divider, 0.8)}
              strokeDasharray="6 3"
              label={{ value: 'Forecast →', fontSize: 11, fill: theme.palette.text.secondary, position: 'insideTopRight' }}
            />
          )}

          {/* Historical area */}
          <Area
            type="monotone"
            dataKey="predicted"
            data={historical}
            fill="url(#histGrad)"
            stroke={theme.palette.primary.main}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />

          {/* Forecast confidence band */}
          <Area
            type="monotone"
            dataKey="upper"
            data={forecast}
            fill="url(#foreGrad)"
            stroke={alpha(theme.palette.warning.main, 0.3)}
            strokeWidth={1}
            strokeDasharray="4 2"
            dot={false}
            legendType="none"
          />
          <Area
            type="monotone"
            dataKey="lower"
            data={forecast}
            fill="white"
            stroke={alpha(theme.palette.warning.main, 0.3)}
            strokeWidth={1}
            strokeDasharray="4 2"
            dot={false}
            legendType="none"
          />

          {/* Forecast line */}
          <Line
            type="monotone"
            dataKey="predicted"
            data={forecast}
            stroke={theme.palette.warning.main}
            strokeWidth={2.5}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 5, fill: theme.palette.warning.main }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};
