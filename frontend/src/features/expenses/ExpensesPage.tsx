import {
  Box, Typography, Paper, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Table, TableBody, TableCell, TableHead,
  TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Stack, InputAdornment, Pagination, Tooltip,
  CircularProgress, Switch, FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useExpenses, useExpenseStats, useCreateExpense, useUpdateExpense, useDeleteExpense } from './hooks/useExpenses';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { showSnackbar } from '../../app/uiSlice';

const CATEGORIES = [
  'salaries', 'rent', 'utilities', 'marketing', 'inventory', 'equipment',
  'software', 'travel', 'insurance', 'taxes', 'maintenance', 'office_supplies',
  'professional_services', 'shipping', 'other',
];
const PAY_METHODS = ['cash', 'card', 'bank_transfer', 'cheque', 'other'];
const PAY_STATUSES = ['paid', 'pending', 'rejected'];

const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PAY_COLOR: Record<string, any> = { paid: 'success', pending: 'warning', rejected: 'error' };

const emptyForm = () => ({
  title: '', description: '', category: 'other', amount: '', taxAmount: '0',
  expenseDate: format(new Date(), 'yyyy-MM-dd'), paymentMethod: 'bank_transfer',
  paymentStatus: 'paid', vendor: '', isRecurring: false, recurringInterval: 'monthly', tags: '',
});

const MotionPaper = motion(Paper);

export function ExpensesPage() {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [payFilter, setPayFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const params = { page, limit: 25, search: search || undefined, category: catFilter || undefined, paymentStatus: payFilter || undefined };
  const { data, isLoading } = useExpenses(params);
  const { data: stats } = useExpenseStats();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const expenses = data?.data ?? [];
  const pagination = data?.pagination ?? {};

  const openCreate = () => { setForm(emptyForm()); setEditId(null); setDialogOpen(true); };
  const openEdit = (e: any) => {
    setForm({
      title: e.title, description: e.description ?? '', category: e.category,
      amount: String(e.amount), taxAmount: String(e.taxAmount ?? 0),
      expenseDate: format(new Date(e.expenseDate), 'yyyy-MM-dd'),
      paymentMethod: e.paymentMethod, paymentStatus: e.paymentStatus,
      vendor: e.vendor ?? '', isRecurring: e.isRecurring,
      recurringInterval: e.recurringInterval ?? 'monthly',
      tags: (e.tags ?? []).join(', '),
    });
    setEditId(e._id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        taxAmount: parseFloat(form.taxAmount) || 0,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        recurringInterval: form.isRecurring ? form.recurringInterval : undefined,
      };
      if (editId) await updateExpense.mutateAsync({ id: editId, data: payload });
      else await createExpense.mutateAsync(payload);
      dispatch(showSnackbar({ message: editId ? 'Expense updated' : 'Expense created', severity: 'success' }));
      setDialogOpen(false);
    } catch (e: any) {
      dispatch(showSnackbar({ message: e.response?.data?.message ?? 'Save failed', severity: 'error' }));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteExpense.mutateAsync(deleteId);
      dispatch(showSnackbar({ message: 'Expense deleted', severity: 'info' }));
      setDeleteId(null);
    } catch {
      dispatch(showSnackbar({ message: 'Delete failed', severity: 'error' }));
    }
  };

  const totalAmount = parseFloat(form.amount || '0') + parseFloat(form.taxAmount || '0');

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Expenses</Typography>
          <Typography variant="body2" color="text.secondary">Track business expenses and costs</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Expense</Button>
      </Box>

      {/* Stats */}
      {stats && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Expenses', value: fmt(stats.totals?.total ?? 0) },
            { label: 'Count', value: (stats.totals?.count ?? 0).toLocaleString() },
            { label: 'Average', value: fmt(stats.totals?.avgAmount ?? 0) },
          ].map(({ label, value }) => (
            <MotionPaper key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} elevation={0}
              sx={{ border: 1, borderColor: 'divider', p: 2, flex: '1 1 160px', minWidth: 140 }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccountBalanceWalletIcon color="action" fontSize="small" />
                <Typography variant="h6" fontWeight={700}>{value}</Typography>
              </Box>
            </MotionPaper>
          ))}
          {/* Top categories */}
          {(stats.byCategory ?? []).slice(0, 3).map((c: any) => (
            <MotionPaper key={c._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} elevation={0}
              sx={{ border: 1, borderColor: 'divider', p: 2, flex: '1 1 140px', minWidth: 130 }}>
              <Typography variant="caption" color="text.secondary">{c._id}</Typography>
              <Typography variant="h6" fontWeight={700}>{fmt(c.total)}</Typography>
            </MotionPaper>
          ))}
        </Box>
      )}

      {/* Filters */}
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Search title, vendor…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 240 }} />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Category</InputLabel>
          <Select value={catFilter} label="Category" onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">All</MenuItem>
            {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c.replace(/_/g, ' ')}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Payment</InputLabel>
          <Select value={payFilter} label="Payment" onChange={(e) => { setPayFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">All</MenuItem>
            {PAY_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      {/* Table */}
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Expense #', 'Date', 'Title', 'Category', 'Vendor', 'Amount', 'Tax', 'Total', 'Status', ''].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
            ) : !expenses.length ? (
              <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No expenses found</Typography></TableCell></TableRow>
            ) : expenses.map((e: any) => (
              <TableRow key={e._id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <TableCell><Typography variant="body2" fontFamily="monospace" fontWeight={500}>{e.expenseNumber}</Typography></TableCell>
                <TableCell>{format(new Date(e.expenseDate), 'MMM d, yyyy')}</TableCell>
                <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" noWrap>{e.title}</Typography></TableCell>
                <TableCell><Chip label={e.category.replace(/_/g, ' ')} size="small" variant="outlined" /></TableCell>
                <TableCell>{e.vendor ?? '—'}</TableCell>
                <TableCell>{fmt(e.amount)}</TableCell>
                <TableCell>{fmt(e.taxAmount ?? 0)}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{fmt(e.totalAmount)}</TableCell>
                <TableCell><Chip label={e.paymentStatus} color={PAY_COLOR[e.paymentStatus]} size="small" /></TableCell>
                <TableCell>
                  <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(e)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteId(e._id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {pagination.pages > 1 && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Pagination count={pagination.pages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Edit Expense' : 'New Expense'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth required />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select value={form.category} label="Category" onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c.replace(/_/g, ' ')}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Expense Date" type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} fullWidth required inputProps={{ min: 0 }} />
              <TextField label="Tax Amount" type="number" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} fullWidth inputProps={{ min: 0 }} />
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select value={form.paymentMethod} label="Payment Method" onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  {PAY_METHODS.map((m) => <MenuItem key={m} value={m}>{m.replace(/_/g, ' ')}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Payment Status</InputLabel>
                <Select value={form.paymentStatus} label="Payment Status" onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
                  {PAY_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Vendor" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} fullWidth />
              <TextField label="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} fullWidth />
            </Box>
            <TextField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={2} fullWidth />
            <FormControlLabel
              control={<Switch checked={form.isRecurring} onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} />}
              label="Recurring expense"
            />
            {form.isRecurring && (
              <FormControl fullWidth size="small">
                <InputLabel>Interval</InputLabel>
                <Select value={form.recurringInterval} label="Interval" onChange={(e) => setForm({ ...form, recurringInterval: e.target.value })}>
                  {['weekly', 'monthly', 'quarterly', 'yearly'].map((i) => <MenuItem key={i} value={i}>{i}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Typography variant="subtitle1" fontWeight={700}>Total: {fmt(totalAmount)}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={createExpense.isPending || updateExpense.isPending}>
            {createExpense.isPending || updateExpense.isPending ? <CircularProgress size={18} /> : editId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Expense?</DialogTitle>
        <DialogContent><Typography>This will permanently delete the expense.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteExpense.isPending}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
