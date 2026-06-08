import { Box, Typography, useTheme, alpha } from '@mui/material';
import { HeatmapPoint } from '../../types';
import { DAYS_OF_WEEK } from '../../utils/formatters';

interface Props { data: HeatmapPoint[]; metric?: 'orders' | 'revenue' }

export const HeatmapChart = ({ data, metric = 'orders' }: Props) => {
  const theme = useTheme();

  const grid: Record<string, Record<number, number>> = {};
  let maxVal = 0;

  for (const point of data) {
    const day = point._id.dayOfWeek;
    const hour = point._id.hour;
    const val = metric === 'orders' ? point.orders : point.revenue;
    if (!grid[day]) grid[day] = {};
    grid[day][hour] = val;
    if (val > maxVal) maxVal = val;
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = [1, 2, 3, 4, 5, 6, 7];

  const getColor = (val: number) => {
    if (!val || maxVal === 0) return theme.palette.mode === 'dark' ? '#1E293B' : '#F8FAFC';
    const intensity = val / maxVal;
    return alpha(theme.palette.primary.main, Math.max(0.1, intensity));
  };

  const formatHour = (h: number) => {
    if (h === 0) return '12am';
    if (h === 12) return '12pm';
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  };

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5, ml: 6 }}>
        {hours.map((h) => (
          h % 3 === 0 ? (
            <Typography key={h} variant="caption" color="text.secondary" sx={{ width: 28, textAlign: 'center', fontSize: 10 }}>
              {formatHour(h)}
            </Typography>
          ) : <Box key={h} sx={{ width: 28 }} />
        ))}
      </Box>

      {days.map((day) => (
        <Box key={day} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ width: 28, fontSize: 11, flexShrink: 0 }}>
            {DAYS_OF_WEEK[day % 7]}
          </Typography>
          {hours.map((hour) => {
            const val = grid[day]?.[hour] ?? 0;
            return (
              <Box
                key={hour}
                title={`${DAYS_OF_WEEK[day % 7]} ${formatHour(hour)}: ${val} ${metric}`}
                sx={{
                  width: 28, height: 22, borderRadius: 0.5,
                  backgroundColor: getColor(val),
                  cursor: 'default',
                  transition: 'transform 0.1s',
                  '&:hover': { transform: 'scale(1.2)', zIndex: 1 },
                  border: `1px solid ${theme.palette.divider}`,
                }}
              />
            );
          })}
        </Box>
      ))}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, ml: 6 }}>
        <Typography variant="caption" color="text.secondary">Low</Typography>
        {[0.1, 0.3, 0.5, 0.7, 1].map((i) => (
          <Box key={i} sx={{ width: 20, height: 14, borderRadius: 0.5, backgroundColor: alpha(theme.palette.primary.main, i) }} />
        ))}
        <Typography variant="caption" color="text.secondary">High</Typography>
      </Box>
    </Box>
  );
};
