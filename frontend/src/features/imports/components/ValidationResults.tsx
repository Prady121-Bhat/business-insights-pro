import {
  Box, Typography, Alert, Chip, Table, TableBody, TableCell,
  TableHead, TableRow, Collapse, Button, LinearProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useState } from 'react';

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface Props {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ValidationError[];
  totalErrors: number;
}

export function ValidationResults({ totalRows, validRows, invalidRows, errors, totalErrors }: Props) {
  const [expanded, setExpanded] = useState(false);
  const pct = totalRows > 0 ? Math.round((validRows / totalRows) * 100) : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 140 }}>
          <Typography variant="caption" color="text.secondary">Total Rows</Typography>
          <Typography variant="h5" fontWeight={700}>{totalRows.toLocaleString()}</Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 140 }}>
          <Typography variant="caption" color="success.main">Valid</Typography>
          <Typography variant="h5" fontWeight={700} color="success.main">{validRows.toLocaleString()}</Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 140 }}>
          <Typography variant="caption" color="error.main">Invalid</Typography>
          <Typography variant="h5" fontWeight={700} color="error.main">{invalidRows.toLocaleString()}</Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 140 }}>
          <Typography variant="caption" color="text.secondary">Pass Rate</Typography>
          <Typography variant="h5" fontWeight={700} color={pct >= 80 ? 'success.main' : pct >= 50 ? 'warning.main' : 'error.main'}>
            {pct}%
          </Typography>
        </Box>
      </Box>

      <LinearProgress
        variant="determinate"
        value={pct}
        color={pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error'}
        sx={{ height: 8, borderRadius: 4, mb: 2 }}
      />

      {validRows === 0 && (
        <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
          No valid rows found. Fix column mapping or file data before importing.
        </Alert>
      )}

      {validRows > 0 && invalidRows === 0 && (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
          All {validRows.toLocaleString()} rows valid. Ready to import.
        </Alert>
      )}

      {validRows > 0 && invalidRows > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {validRows.toLocaleString()} rows will be imported. {invalidRows.toLocaleString()} rows will be skipped.
        </Alert>
      )}

      {errors.length > 0 && (
        <Box>
          <Button
            size="small"
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setExpanded(!expanded)}
            sx={{ mb: 1 }}
          >
            {expanded ? 'Hide' : 'Show'} errors ({totalErrors.toLocaleString()})
          </Button>

          <Collapse in={expanded}>
            <Table size="small" sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'error.light' }}>
                  <TableCell sx={{ fontWeight: 600, width: 80 }}>Row</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 140 }}>Field</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {errors.map((err, i) => (
                  <TableRow key={i} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell>
                      <Chip label={err.row} size="small" color="error" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{err.field}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="error.main">{err.message}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalErrors > errors.length && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Showing {errors.length} of {totalErrors.toLocaleString()} errors.
              </Typography>
            )}
          </Collapse>
        </Box>
      )}
    </Box>
  );
}
