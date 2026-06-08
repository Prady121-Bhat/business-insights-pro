import {
  Table, TableBody, TableCell, TableHead, TableRow,
  Select, MenuItem, FormControl, Chip, Typography, Box,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  type: string;
}

interface Props {
  headers: string[];
  fields: FieldDef[];
  mapping: Record<string, string>;
  preview: Record<string, any>[];
  onChange: (mapping: Record<string, string>) => void;
}

export function ColumnMappingTable({ headers, fields, mapping, preview, onChange }: Props) {
  const reverseMapping = Object.entries(mapping).reduce<Record<string, string>>(
    (acc, [col, field]) => { acc[field] = col; return acc; },
    {},
  );

  const handleChange = (csvHeader: string, fieldKey: string) => {
    const next = { ...mapping };
    // Remove any other column mapped to same field
    Object.keys(next).forEach((col) => { if (next[col] === fieldKey && col !== csvHeader) delete next[col]; });
    if (fieldKey === '__skip__') delete next[csvHeader];
    else next[csvHeader] = fieldKey;
    onChange(next);
  };

  const mappedFields = new Set(Object.values(mapping));
  const requiredFields = fields.filter((f) => f.required).map((f) => f.key);
  const missingRequired = requiredFields.filter((k) => !mappedFields.has(k));

  return (
    <Box>
      {missingRequired.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
          <Typography variant="caption" color="error" sx={{ mr: 1 }}>Required missing:</Typography>
          {missingRequired.map((k) => (
            <Chip key={k} label={fields.find((f) => f.key === k)?.label ?? k} size="small" color="error" variant="outlined" />
          ))}
        </Box>
      )}

      <Table size="small" sx={{ '& td, & th': { py: 0.75 } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 180, fontWeight: 600 }}>CSV Column</TableCell>
            <TableCell sx={{ width: 220, fontWeight: 600 }}>Maps To</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Preview (first rows)</TableCell>
            <TableCell sx={{ width: 36 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {headers.map((header) => {
            const mapped = mapping[header];
            const field = fields.find((f) => f.key === mapped);
            const isMapped = !!mapped;

            return (
              <TableRow key={header} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">{header}</Typography>
                </TableCell>
                <TableCell>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={mapped || '__skip__'}
                      onChange={(e) => handleChange(header, e.target.value)}
                      displayEmpty
                      sx={{ fontSize: 13 }}
                    >
                      <MenuItem value="__skip__">
                        <Typography variant="body2" color="text.secondary">— Skip —</Typography>
                      </MenuItem>
                      {fields.map((f) => (
                        <MenuItem
                          key={f.key}
                          value={f.key}
                          disabled={mappedFields.has(f.key) && mapping[header] !== f.key}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2">{f.label}</Typography>
                            {f.required && <Typography variant="caption" color="error">*</Typography>}
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>({f.type})</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary" fontFamily="monospace" noWrap sx={{ maxWidth: 280, display: 'block' }}>
                    {preview.slice(0, 3).map((r) => r[header] ?? '—').join(' · ')}
                  </Typography>
                </TableCell>
                <TableCell>
                  {isMapped
                    ? <CheckCircleOutlineIcon fontSize="small" color="success" />
                    : <RadioButtonUncheckedIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
