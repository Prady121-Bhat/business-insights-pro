import { useState, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Button, Stepper, Step, StepLabel, StepContent,
  FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  LinearProgress, Chip, Table, TableBody, TableCell, TableHead, TableRow,
  Divider, Stack, IconButton, Tooltip,
} from '@mui/material';
import { motion } from 'framer-motion';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import CancelIcon from '@mui/icons-material/Cancel';
import HistoryIcon from '@mui/icons-material/History';
import { format } from 'date-fns';

import { ColumnMappingTable } from './components/ColumnMappingTable';
import { ValidationResults } from './components/ValidationResults';
import {
  useUploadFile, useValidateMapping, useStartImport,
  useImportJob, useImportJobs, useCancelJob,
} from './hooks/useImports';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { showSnackbar } from '../../app/uiSlice';

const ENTITY_TYPES = [
  { value: 'customers', label: 'Customers' },
  { value: 'products', label: 'Products' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'sales', label: 'Sales' },
];

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  mapping: 'warning',
  validating: 'warning',
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'error',
  cancelled: 'default',
};

const MotionPaper = motion(Paper);

export function ImportPage() {
  const dispatch = useAppDispatch();

  // Wizard state
  const [activeStep, setActiveStep] = useState(0);
  const [entityType, setEntityType] = useState('customers');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload result
  const [uploadResult, setUploadResult] = useState<{
    jobId: string;
    headers: string[];
    totalRows: number;
    fields: any[];
    suggestedMapping: Record<string, string>;
    preview: Record<string, any>[];
  } | null>(null);

  // Mapping state
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Validation result
  const [validationResult, setValidationResult] = useState<{
    jobId: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    errors: any[];
    totalErrors: number;
    canProceed: boolean;
  } | null>(null);

  // Active job id for polling
  const [activeJobId, setActiveJobId] = useState('');

  // Mutations
  const uploadMutation = useUploadFile();
  const validateMutation = useValidateMapping();
  const startMutation = useStartImport();
  const cancelMutation = useCancelJob();

  // Poll active job
  const { data: activeJob } = useImportJob(activeJobId, !!activeJobId);

  // History
  const { data: historyData, refetch: refetchHistory } = useImportJobs();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      const result = await uploadMutation.mutateAsync({ file: selectedFile, entityType });
      setUploadResult(result);
      setMapping(result.suggestedMapping);
      setActiveStep(1);
    } catch (err: any) {
      dispatch(showSnackbar({ message: err.response?.data?.message || 'Upload failed', severity: 'error' }));
    }
  };

  const handleValidate = async () => {
    if (!uploadResult) return;
    try {
      const result = await validateMutation.mutateAsync({ jobId: String(uploadResult.jobId), mapping });
      setValidationResult(result);
      setActiveStep(2);
    } catch (err: any) {
      dispatch(showSnackbar({ message: err.response?.data?.message || 'Validation failed', severity: 'error' }));
    }
  };

  const handleStartImport = async () => {
    if (!validationResult) return;
    try {
      await startMutation.mutateAsync(String(validationResult.jobId));
      setActiveJobId(String(validationResult.jobId));
      setActiveStep(3);
    } catch (err: any) {
      dispatch(showSnackbar({ message: err.response?.data?.message || 'Failed to start import', severity: 'error' }));
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedFile(null);
    setUploadResult(null);
    setMapping({});
    setValidationResult(null);
    setActiveJobId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isJobDone = activeJob?.status === 'completed' || activeJob?.status === 'failed';

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Data Import Center</Typography>
        <Typography variant="body2" color="text.secondary">
          Import customers, products, expenses, or sales from CSV / Excel files.
        </Typography>
      </Box>

      {/* Wizard */}
      <MotionPaper
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        elevation={0}
        sx={{ border: 1, borderColor: 'divider', p: 3, mb: 4 }}
      >
        <Stepper activeStep={activeStep} orientation="vertical">
          {/* Step 1 — Upload */}
          <Step>
            <StepLabel>Upload File</StepLabel>
            <StepContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <FormControl size="small" sx={{ maxWidth: 240 }}>
                  <InputLabel>Entity Type</InputLabel>
                  <Select
                    value={entityType}
                    label="Entity Type"
                    onChange={(e) => setEntityType(e.target.value)}
                  >
                    {ENTITY_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Drop zone */}
                <Box
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    border: 2,
                    borderStyle: 'dashed',
                    borderColor: dragOver ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: dragOver ? 'action.hover' : 'background.default',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                  }}
                >
                  <UploadFileIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body1" fontWeight={500}>
                    {selectedFile ? selectedFile.name : 'Drop CSV or Excel file here'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB — click to change`
                      : 'Supports .csv, .xlsx, .xls — max 10 MB'}
                  </Typography>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={handleFileInput}
                  />
                </Box>

                <Button
                  variant="contained"
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                  startIcon={uploadMutation.isPending ? <CircularProgress size={16} /> : <UploadFileIcon />}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {uploadMutation.isPending ? 'Uploading…' : 'Upload & Continue'}
                </Button>
              </Stack>
            </StepContent>
          </Step>

          {/* Step 2 — Map Columns */}
          <Step>
            <StepLabel>Map Columns</StepLabel>
            <StepContent>
              {uploadResult && (
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    {uploadResult.totalRows.toLocaleString()} rows detected. Map your CSV columns to the required fields below.
                  </Alert>

                  <ColumnMappingTable
                    headers={uploadResult.headers}
                    fields={uploadResult.fields}
                    mapping={mapping}
                    preview={uploadResult.preview}
                    onChange={setMapping}
                  />

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" onClick={() => setActiveStep(0)}>Back</Button>
                    <Button
                      variant="contained"
                      onClick={handleValidate}
                      disabled={validateMutation.isPending || Object.keys(mapping).length === 0}
                      startIcon={validateMutation.isPending ? <CircularProgress size={16} /> : undefined}
                    >
                      {validateMutation.isPending ? 'Validating…' : 'Validate Data'}
                    </Button>
                  </Box>
                </Stack>
              )}
            </StepContent>
          </Step>

          {/* Step 3 — Review & Start */}
          <Step>
            <StepLabel>Review & Import</StepLabel>
            <StepContent>
              {validationResult && (
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <ValidationResults
                    totalRows={validationResult.totalRows}
                    validRows={validationResult.validRows}
                    invalidRows={validationResult.invalidRows}
                    errors={validationResult.errors}
                    totalErrors={validationResult.totalErrors}
                  />

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" onClick={() => setActiveStep(1)}>Back</Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleStartImport}
                      disabled={!validationResult.canProceed || startMutation.isPending}
                      startIcon={startMutation.isPending ? <CircularProgress size={16} /> : undefined}
                    >
                      {startMutation.isPending ? 'Starting…' : `Import ${validationResult.validRows.toLocaleString()} Rows`}
                    </Button>
                  </Box>
                </Stack>
              )}
            </StepContent>
          </Step>

          {/* Step 4 — Progress */}
          <Step>
            <StepLabel>Import Progress</StepLabel>
            <StepContent>
              {activeJob && (
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      label={activeJob.status}
                      color={STATUS_COLORS[activeJob.status] ?? 'default'}
                      size="small"
                    />
                    {!isJobDone && <CircularProgress size={16} />}
                  </Box>

                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">
                        {activeJob.progress?.processed ?? 0} / {activeJob.progress?.total ?? 0} rows
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {activeJob.progress?.percentage ?? 0}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant={isJobDone ? 'determinate' : 'buffer'}
                      value={activeJob.progress?.percentage ?? 0}
                      color={activeJob.status === 'failed' ? 'error' : activeJob.status === 'completed' ? 'success' : 'primary'}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>

                  {isJobDone && activeJob.result && (
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Created', value: activeJob.result.created, color: 'success.main' },
                        { label: 'Updated', value: activeJob.result.updated, color: 'info.main' },
                        { label: 'Skipped', value: activeJob.result.skipped, color: 'text.secondary' },
                        { label: 'Failed', value: activeJob.result.failed, color: 'error.main' },
                      ].map(({ label, value, color }) => (
                        <Box key={label} textAlign="center">
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                          <Typography variant="h6" fontWeight={700} color={color}>{value}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {activeJob.status === 'failed' && activeJob.errorMessage && (
                    <Alert severity="error">{activeJob.errorMessage}</Alert>
                  )}

                  {activeJob.status === 'completed' && (
                    <Alert severity="success" icon={<CheckCircleIcon />}>
                      Import completed successfully.
                    </Alert>
                  )}

                  <Button variant="outlined" onClick={handleReset} startIcon={<RefreshIcon />} sx={{ alignSelf: 'flex-start' }}>
                    New Import
                  </Button>
                </Stack>
              )}
            </StepContent>
          </Step>
        </Stepper>
      </MotionPaper>

      {/* Import History */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon color="action" />
            <Typography variant="h6" fontWeight={600}>Import History</Typography>
          </Box>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={() => refetchHistory()}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Paper elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
          {!historyData?.data?.length ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No import jobs yet.</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>File</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Entity</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Rows</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Result</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {historyData.data.map((job: any) => (
                  <TableRow key={job._id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DownloadIcon fontSize="small" color="action" />
                        <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                          {job.fileName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={job.entityType} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={job.status}
                        size="small"
                        color={STATUS_COLORS[job.status] ?? 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {job.status === 'processing'
                        ? <LinearProgress sx={{ width: 60 }} variant="determinate" value={job.progress?.percentage ?? 0} />
                        : <Typography variant="body2">{job.validation?.totalRows?.toLocaleString() ?? '—'}</Typography>}
                    </TableCell>
                    <TableCell>
                      {job.result && (
                        <Typography variant="caption" color="text.secondary">
                          +{job.result.created} /{job.result.updated}u /{job.result.failed}f
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {job.createdAt ? format(new Date(job.createdAt), 'MMM d, HH:mm') : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {['mapping', 'validating', 'pending'].includes(job.status) && (
                        <Tooltip title="Cancel">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => cancelMutation.mutate(job._id)}
                            disabled={cancelMutation.isPending}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
