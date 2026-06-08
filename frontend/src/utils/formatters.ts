export const formatCurrency = (value: number, currency = 'USD', locale = 'en-US'): string => {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
};

export const formatNumber = (value: number, locale = 'en-US'): string => {
  return new Intl.NumberFormat(locale).format(value);
};

export const formatPercent = (value: number, decimals = 1): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

export const formatGrowth = (value: number): { text: string; positive: boolean } => ({
  text: formatPercent(value),
  positive: value >= 0,
});

export const formatDate = (date: string | Date, format = 'MMM d, yyyy'): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatShortDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatRelativeTime = (date: string | Date): string => {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
};

export const formatCompactNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
};

export const trendLabel = (value: TrendDataPoint, granularity: string): string => {
  const { year, month, day } = value._id;
  if (granularity === 'year') return String(year);
  if (granularity === 'month') return new Date(year, (month ?? 1) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  if (granularity === 'week') return `W${value._id.week ?? ''} ${year}`;
  return new Date(year, (month ?? 1) - 1, day ?? 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface TrendDataPoint {
  _id: { year: number; month?: number; day?: number; week?: number };
}

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
