import { useState } from 'react';
import {
  Grid, Card, CardContent, Box, Typography, Button, Chip, Alert,
  Select, MenuItem, FormControl, InputLabel, TextField, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  LinearProgress, Tooltip, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  AssessmentOutlined, DownloadOutlined, DeleteOutlined,
  PictureAsPdfOutlined, TableChartOutlined, ArticleOutlined,
  CheckCircleOutlined, ErrorOutlined, HourglassBottomOutlined, RefreshOutlined,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { useReports, useGenerateReport, useDeleteReport, useReportStats, downloadReport } from './hooks/useReports';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { showSnackbar } from '../../app/uiSlice';
import { formatCurrency } from '../../utils/formatters';

const REPORT_TYPES = [
  { value: 'revenue', label: 'Revenue Report', desc: 'Revenue, profit, trends, top products, channels' },
  { value: 'sales', label: 'Sales Report', desc: 'Transaction list, daily totals, category breakdown' },
  { value: 'customer', label: 'Customer Report', desc: 'Segments, CLV, churn risk, top customers' },
  { value: 'inventory', label: 'Inventory Report', desc: 'Stock levels, velocity, low stock, dead inventory' },
  { value: 'expense', label: 'Expense Report', desc: 'Expense breakdown by category, trends, transactions' },
];

const FORMAT_CONFIG = {
  pdf: { icon: <PictureAsPdfOutlined sx={{ fontSize: 16 }} />, color: '#EF4444', label: 'PDF' },
  excel: { icon: <TableChartOutlined sx={{ fontSize: 16 }} />, color: '#10B981', label: 'Excel' },
  csv: { icon: <ArticleOutlined sx={{ fontSize: 16 }} />, color: '#3B82F6', label: 'CSV' },
};

const STATUS_CONFIG = {
  completed: { color: 'success' as const, icon: <CheckCircleOutlined sx={{ fontSize: 14 }} /> },
  failed: { color: 'error' as const, icon: <ErrorOutlined sx={{ fontSize: 14 }} /> },
  generating: { color: 'warning' as const, icon: <HourglassBottomOutlined sx={{ fontSize: 14 }} /> },
  pending: { color: 'default' as const, icon: <HourglassBottomOutlined sx={{ fontSize: 14 }} /> },
};

function fmtBytes(b?: number) {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function defaultTitle(type: string, format: string) {
  const label = REPORT_TYPES.find((t) => t.value === type)?.label ?? type;
  return `${label} — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export const ReportsPage = () => {
  const dispatch = useAppDispatch();
  const [type, setType] = useState('revenue');
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>('excel');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterFormat, setFilterFormat] = useState('');
  const [generating, setGenerating] = useState(false);

  const reports = useReports({ type: filterType || undefined, format: filterFormat || undefined });
  const stats = useReportStats();
  const generateMutation = useGenerateReport();
  const deleteMutation = useDeleteReport();

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateMutation.mutateAsync({
        type, format,
        title: title.trim() || defaultTitle(type, format),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      dispatch(showSnackbar({ message: 'Report generated successfully', severity: 'success' }));
      setTitle('');
    } catch (e: any) {
      dispatch(showSnackbar({ message: e.message ?? 'Report generation failed', severity: 'error' }));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report: any) => {
    try {
      const ext = report.format === 'excel' ? 'xlsx' : report.format;
      const filename = `${(report.title ?? 'report').replace(/[^a-z0-9]/gi, '_')}.${ext}`;
      await downloadReport(report._id, filename);
      dispatch(showSnackbar({ message: 'Download started', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Download failed', severity: 'error' }));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      dispatch(showSnackbar({ message: 'Report deleted', severity: 'info' }));
    } catch {
      dispatch(showSnackbar({ message: 'Delete failed', severity: 'error' }));
    }
  };

  const selectedType = REPORT_TYPES.find((t) => t.value === type);

  return (
    <Box>
      <PageHeader
        title="Reports"
        subtitle="Generate PDF, Excel and CSV reports for revenue, sales, customers, inventory and expenses"
        breadcrumbs={[{ label: 'Reports' }]}
      />

      <Grid container spacing={3}>
        {/* Builder panel */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: { md: 'sticky' }, top: 16 }}>
            <CardContent>
              <Typography variant="h6" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssessmentOutlined fontSize="small" />
                Report Builder
              </Typography>

              {/* Report type */}
              <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                <InputLabel>Report Type</InputLabel>
                <Select value={type} label="Report Type" onChange={(e) => { setType(e.target.value); setTitle(''); }}>
                  {REPORT_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      <Box>
                        <Typography variant="body2">{t.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{t.desc}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedType && (
                <Alert severity="info" sx={{ mb: 1.5, py: 0.5, fontSize: 12 }}>
                  {selectedType.desc}
                </Alert>
              )}

              {/* Format */}
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>Format</Typography>
                <ToggleButtonGroup value={format} exclusive onChange={(_, v) => v && setFormat(v)} fullWidth size="small">
                  {Object.entries(FORMAT_CONFIG).map(([fmt, cfg]) => (
                    <ToggleButton key={fmt} value={fmt} sx={{ gap: 0.5, fontSize: 12 }}>
                      <Box sx={{ color: cfg.color, display: 'flex' }}>{cfg.icon}</Box>
                      {cfg.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              {/* Title */}
              <TextField
                fullWidth
                size="small"
                label="Report Title (optional)"
                placeholder={defaultTitle(type, format)}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                sx={{ mb: 1.5 }}
              />

              {/* Date range — not required for inventory */}
              {type !== 'inventory' && (
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                  <TextField
                    size="small"
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  <TextField
                    size="small"
                    label="End Date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Box>
              )}

              {!startDate && type !== 'inventory' && (
                <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                  No date range = last 30 days
                </Typography>
              )}

              <Button
                fullWidth
                variant="contained"
                onClick={handleGenerate}
                disabled={generating || generateMutation.isPending}
                size="large"
                startIcon={<AssessmentOutlined />}
              >
                {generating ? 'Generating…' : 'Generate Report'}
              </Button>

              {generating && <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />}
            </CardContent>
          </Card>

          {/* Stats */}
          {!stats.isLoading && stats.data && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" mb={1.5} color="text.secondary">Report Statistics</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Total Generated</Typography>
                  <Typography variant="body2" fontWeight={700}>{stats.data.total}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                {(stats.data.byType ?? []).map((t: any) => (
                  <Box key={t._id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{t._id}</Typography>
                    <Typography variant="caption" fontWeight={600}>{t.count}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* History panel */}
        <Grid item xs={12} md={8}>
          <Card>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6">Report History</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl size="small" sx={{ minWidth: 110 }}>
                  <InputLabel>Type</InputLabel>
                  <Select value={filterType} label="Type" onChange={(e) => setFilterType(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    {REPORT_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 90 }}>
                  <InputLabel>Format</InputLabel>
                  <Select value={filterFormat} label="Format" onChange={(e) => setFilterFormat(e.target.value)}>
                    <MenuItem value="">All</MenuItem>
                    {Object.entries(FORMAT_CONFIG).map(([fmt, cfg]) => <MenuItem key={fmt} value={fmt}>{cfg.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <IconButton size="small" onClick={() => reports.refetch()} title="Refresh">
                  <RefreshOutlined fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {reports.isLoading ? <LoadingState /> : !reports.data?.data?.length ? (
              <Box sx={{ p: 4 }}>
                <EmptyState
                  title="No reports yet"
                  description="Use the builder to generate your first report."
                  icon={<AssessmentOutlined sx={{ fontSize: 48, color: 'text.disabled' }} />}
                />
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Report</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Format</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(reports.data.data ?? []).map((report: any) => {
                    const fmtCfg = FORMAT_CONFIG[report.format as keyof typeof FORMAT_CONFIG];
                    const statusCfg = STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
                    const typeLabel = REPORT_TYPES.find((t) => t.value === report.type)?.label ?? report.type;
                    return (
                      <TableRow key={report._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} sx={{ maxWidth: 200 }} noWrap>{report.title}</Typography>
                          {report.generationDuration && (
                            <Typography variant="caption" color="text.secondary">{(report.generationDuration / 1000).toFixed(1)}s</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip label={typeLabel} size="small" variant="outlined" sx={{ fontSize: 10, textTransform: 'capitalize' }} />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: fmtCfg?.color }}>
                            {fmtCfg?.icon}
                            <Typography variant="body2" fontWeight={600}>{fmtCfg?.label ?? report.format}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={report.status}
                            size="small"
                            color={statusCfg.color}
                            icon={statusCfg.icon}
                            sx={{ fontSize: 10 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{fmtBytes(report.fileSize)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            {report.status === 'completed' && (
                              <Tooltip title="Download">
                                <IconButton size="small" onClick={() => handleDownload(report)} color="primary">
                                  <DownloadOutlined fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(report._id)}
                                color="error"
                                disabled={deleteMutation.isPending}
                              >
                                <DeleteOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
