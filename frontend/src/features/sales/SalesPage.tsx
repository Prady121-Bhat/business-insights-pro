import {
  Box, Typography, Paper, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Table, TableBody, TableCell, TableHead,
  TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Stack, InputAdornment, Pagination, Tooltip,
  CircularProgress, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useSales, useSaleStats, useCreateSale, useUpdateSale, useDeleteSale } from './hooks/useSales';
import { useProducts } from '../products/hooks/useProducts';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { showSnackbar } from '../../app/uiSlice';

const STATUS_COLOR: Record<string, any> = {
  confirmed: 'success', pending: 'warning', shipped: 'info',
  delivered: 'success', cancelled: 'error', refunded: 'default',
};
const PAY_COLOR: Record<string, any> = { paid: 'success', unpaid: 'error', partial: 'warning', refunded: 'default' };

const CHANNELS = ['online', 'in_store', 'phone', 'wholesale', 'other'];
const PAY_METHODS = ['cash', 'card', 'bank_transfer', 'online', 'cheque', 'other'];
const PAY_STATUSES = ['paid', 'unpaid', 'partial'];

const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface SaleItem { productId: string; productName?: string; sku?: string; quantity: number; unitPrice: number; discount: number; taxRate: number }

const emptyItem = (): SaleItem => ({ productId: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 });
const emptyForm = () => ({
  customerId: '', customerName: '', channel: 'in_store', paymentMethod: 'cash',
  paymentStatus: 'paid', saleDate: format(new Date(), 'yyyy-MM-dd'), notes: '', items: [emptyItem()],
});

const MotionPaper = motion(Paper);

export function SalesPage() {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const params = { page, limit: 25, search: search || undefined, status: statusFilter || undefined, channel: channelFilter || undefined };
  const { data, isLoading } = useSales(params);
  const { data: stats } = useSaleStats();
  const { data: productsData } = useProducts({ limit: 200 });
  const products = productsData?.data ?? [];

  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const deleteSale = useDeleteSale();

  const sales = data?.data ?? [];
  const pagination = data?.pagination ?? {};

  const openCreate = () => { setForm(emptyForm()); setEditId(null); setDialogOpen(true); };
  const openEdit = (s: any) => {
    setForm({
      customerId: s.customerId?._id ?? '', customerName: s.customerName ?? '',
      channel: s.channel, paymentMethod: s.paymentMethod, paymentStatus: s.paymentStatus,
      saleDate: format(new Date(s.saleDate), 'yyyy-MM-dd'), notes: s.notes ?? '',
      items: s.items.map((i: any) => ({ productId: String(i.productId), quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount, taxRate: i.taxRate })),
    });
    setEditId(s._id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, items: form.items.filter((i) => i.productId) };
      if (editId) await updateSale.mutateAsync({ id: editId, data: payload });
      else await createSale.mutateAsync(payload);
      dispatch(showSnackbar({ message: editId ? 'Sale updated' : 'Sale created', severity: 'success' }));
      setDialogOpen(false);
    } catch (e: any) {
      dispatch(showSnackbar({ message: e.response?.data?.message ?? 'Save failed', severity: 'error' }));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSale.mutateAsync(deleteId);
      dispatch(showSnackbar({ message: 'Sale cancelled', severity: 'info' }));
      setDeleteId(null);
    } catch {
      dispatch(showSnackbar({ message: 'Delete failed', severity: 'error' }));
    }
  };

  const setItem = (idx: number, field: keyof SaleItem, val: any) => {
    const items = [...form.items];
    (items[idx] as any)[field] = val;
    if (field === 'productId') {
      const p = products.find((p: any) => p._id === val);
      if (p) { items[idx].unitPrice = p.pricing.sellingPrice; items[idx].taxRate = p.pricing.taxRate ?? 0; }
    }
    setForm({ ...form, items });
  };

  const lineTotal = (i: SaleItem) => i.quantity * i.unitPrice - i.discount;
  const grandTotal = form.items.reduce((s, i) => s + lineTotal(i), 0);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Sales</Typography>
          <Typography variant="body2" color="text.secondary">Track and manage all sales transactions</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Sale</Button>
      </Box>

      {/* Stats */}
      {stats && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Revenue', value: fmt(stats.totalRevenue ?? 0), icon: <TrendingUpIcon color="primary" /> },
            { label: 'Gross Profit', value: fmt(stats.totalProfit ?? 0), icon: <TrendingUpIcon color="success" /> },
            { label: 'Orders', value: (stats.totalOrders ?? 0).toLocaleString() },
            { label: 'Avg Order', value: fmt(stats.avgOrderValue ?? 0) },
          ].map(({ label, value, icon }) => (
            <MotionPaper key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} elevation={0}
              sx={{ border: 1, borderColor: 'divider', p: 2, flex: '1 1 160px', minWidth: 140 }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {icon}
                <Typography variant="h6" fontWeight={700}>{value}</Typography>
              </Box>
            </MotionPaper>
          ))}
        </Box>
      )}

      {/* Filters */}
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Search sale#, customer, product…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 260 }} />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">All</MenuItem>
            {['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Channel</InputLabel>
          <Select value={channelFilter} label="Channel" onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">All</MenuItem>
            {CHANNELS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      {/* Table */}
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Sale #', 'Date', 'Customer', 'Items', 'Total', 'Profit', 'Status', 'Payment', 'Channel', ''].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
            ) : !sales.length ? (
              <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No sales found</Typography></TableCell></TableRow>
            ) : sales.map((s: any) => (
              <TableRow key={s._id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <TableCell><Typography variant="body2" fontFamily="monospace" fontWeight={500}>{s.saleNumber}</Typography></TableCell>
                <TableCell>{format(new Date(s.saleDate), 'MMM d, yyyy')}</TableCell>
                <TableCell>{s.customerName ?? s.customerId?.firstName ?? '—'}</TableCell>
                <TableCell>{s.items.length}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{fmt(s.summary.grandTotal)}</TableCell>
                <TableCell sx={{ color: s.summary.grossProfit >= 0 ? 'success.main' : 'error.main' }}>{fmt(s.summary.grossProfit)}</TableCell>
                <TableCell><Chip label={s.status} color={STATUS_COLOR[s.status]} size="small" /></TableCell>
                <TableCell><Chip label={s.paymentStatus} color={PAY_COLOR[s.paymentStatus]} size="small" /></TableCell>
                <TableCell><Chip label={s.channel} size="small" variant="outlined" /></TableCell>
                <TableCell>
                  <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(s)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Cancel"><IconButton size="small" color="error" onClick={() => setDeleteId(s._id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? 'Edit Sale' : 'New Sale'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
              <TextField label="Customer Name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} fullWidth />
              <TextField label="Sale Date" type="date" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
              <FormControl fullWidth>
                <InputLabel>Channel</InputLabel>
                <Select value={form.channel} label="Channel" onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                  {CHANNELS.map((c) => <MenuItem key={c} value={c}>{c.replace('_', ' ')}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select value={form.paymentMethod} label="Payment Method" onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  {PAY_METHODS.map((m) => <MenuItem key={m} value={m}>{m.replace('_', ' ')}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Payment Status</InputLabel>
                <Select value={form.paymentStatus} label="Payment Status" onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
                  {PAY_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} fullWidth />
            </Box>

            <Divider />
            <Typography variant="subtitle2" fontWeight={600}>Line Items</Typography>

            {form.items.map((item, idx) => (
              <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 80px 60px 36px', gap: 1, alignItems: 'flex-start' }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Product</InputLabel>
                  <Select value={item.productId} label="Product" onChange={(e) => setItem(idx, 'productId', e.target.value)}>
                    {products.map((p: any) => <MenuItem key={p._id} value={p._id}>{p.name} ({p.sku})</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField size="small" label="Qty" type="number" value={item.quantity} onChange={(e) => setItem(idx, 'quantity', Number(e.target.value))} inputProps={{ min: 1 }} />
                <TextField size="small" label="Unit Price" type="number" value={item.unitPrice} onChange={(e) => setItem(idx, 'unitPrice', Number(e.target.value))} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
                <TextField size="small" label="Discount" type="number" value={item.discount} onChange={(e) => setItem(idx, 'discount', Number(e.target.value))} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
                <TextField size="small" label="Tax%" type="number" value={item.taxRate} onChange={(e) => setItem(idx, 'taxRate', Number(e.target.value))} />
                <IconButton size="small" color="error" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })} disabled={form.items.length <= 1}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}>
                Add Item
              </Button>
              <Typography variant="subtitle1" fontWeight={700}>
                Total: {fmt(grandTotal)}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={createSale.isPending || updateSale.isPending}>
            {createSale.isPending || updateSale.isPending ? <CircularProgress size={18} /> : editId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel Sale?</DialogTitle>
        <DialogContent><Typography>This will mark the sale as cancelled. This cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Back</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteSale.isPending}>Cancel Sale</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
