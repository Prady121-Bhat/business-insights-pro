import {
  Box, Typography, Paper, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Table, TableBody, TableCell, TableHead,
  TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Stack, InputAdornment, Pagination, Tooltip,
  CircularProgress, LinearProgress, Switch, FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useAdjustStock } from './hooks/useProducts';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { showSnackbar } from '../../app/uiSlice';

const VELOCITY_COLOR: Record<string, any> = { fast: 'success', medium: 'info', slow: 'warning', dead: 'error' };
const fmt = (n: number) => `$${Number(n).toFixed(2)}`;
const pct = (n: number) => `${Number(n).toFixed(1)}%`;

const emptyForm = () => ({
  name: '', sku: '', category: '', brand: '', description: '',
  costPrice: '', sellingPrice: '', taxRate: '0',
  currentStock: '0', reorderPoint: '10', reorderQuantity: '50', maxStock: '1000',
  unit: 'unit', isActive: true,
});

const MotionPaper = motion(Paper);

export function ProductsListPage() {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [velFilter, setVelFilter] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [stockDialog, setStockDialog] = useState<{ id: string; name: string; current: number } | null>(null);
  const [stockAdj, setStockAdj] = useState('');
  const [stockReason, setStockReason] = useState('');

  const params = {
    page, limit: 25,
    search: search || undefined, category: catFilter || undefined,
    velocityCategory: velFilter || undefined, lowStock: lowStock || undefined,
  };
  const { data, isLoading } = useProducts(params);
  const products = data?.data ?? [];
  const pagination = data?.pagination ?? {};

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const adjustStock = useAdjustStock();

  // Extract unique categories
  const categories = [...new Set(products.map((p: any) => p.category).filter(Boolean))];

  const openCreate = () => { setForm(emptyForm()); setEditId(null); setDialogOpen(true); };
  const openEdit = (p: any) => {
    setForm({
      name: p.name, sku: p.sku, category: p.category, brand: p.brand ?? '', description: p.description ?? '',
      costPrice: String(p.pricing.costPrice), sellingPrice: String(p.pricing.sellingPrice), taxRate: String(p.pricing.taxRate ?? 0),
      currentStock: String(p.inventory.currentStock), reorderPoint: String(p.inventory.reorderPoint),
      reorderQuantity: String(p.inventory.reorderQuantity), maxStock: String(p.inventory.maxStock ?? 1000),
      unit: p.unit ?? 'unit', isActive: p.isActive ?? true,
    });
    setEditId(p._id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: form.name, sku: form.sku, category: form.category, brand: form.brand, description: form.description,
        unit: form.unit, isActive: form.isActive,
        pricing: { costPrice: parseFloat(form.costPrice), sellingPrice: parseFloat(form.sellingPrice), taxRate: parseFloat(form.taxRate) },
        inventory: { currentStock: parseInt(form.currentStock), reorderPoint: parseInt(form.reorderPoint), reorderQuantity: parseInt(form.reorderQuantity), maxStock: parseInt(form.maxStock) },
      };
      if (editId) await updateProduct.mutateAsync({ id: editId, data: payload });
      else await createProduct.mutateAsync(payload);
      dispatch(showSnackbar({ message: editId ? 'Product updated' : 'Product created', severity: 'success' }));
      setDialogOpen(false);
    } catch (e: any) {
      dispatch(showSnackbar({ message: e.response?.data?.message ?? 'Save failed', severity: 'error' }));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProduct.mutateAsync(deleteId);
      dispatch(showSnackbar({ message: 'Product deactivated', severity: 'info' }));
      setDeleteId(null);
    } catch {
      dispatch(showSnackbar({ message: 'Delete failed', severity: 'error' }));
    }
  };

  const handleStockAdjust = async () => {
    if (!stockDialog) return;
    try {
      const adjustment = parseInt(stockAdj);
      if (isNaN(adjustment)) return;
      await adjustStock.mutateAsync({ id: stockDialog.id, adjustment, reason: stockReason });
      dispatch(showSnackbar({ message: 'Stock adjusted', severity: 'success' }));
      setStockDialog(null);
      setStockAdj('');
      setStockReason('');
    } catch {
      dispatch(showSnackbar({ message: 'Stock adjustment failed', severity: 'error' }));
    }
  };

  const margin = () => {
    const cost = parseFloat(form.costPrice) || 0;
    const sell = parseFloat(form.sellingPrice) || 0;
    return sell > 0 ? ((sell - cost) / sell * 100).toFixed(1) : '0.0';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Products</Typography>
          <Typography variant="body2" color="text.secondary">Manage your product catalog and inventory</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Product</Button>
      </Box>

      {/* Filters */}
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider', p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Search name, SKU…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 240 }} />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Category</InputLabel>
          <Select value={catFilter} label="Category" onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">All</MenuItem>
            {categories.map((c: any) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Velocity</InputLabel>
          <Select value={velFilter} label="Velocity" onChange={(e) => { setVelFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">All</MenuItem>
            {['fast', 'medium', 'slow', 'dead'].map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch size="small" checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setPage(1); }} />}
          label="Low Stock Only"
        />
      </Paper>

      {/* Table */}
      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['SKU', 'Name', 'Category', 'Cost', 'Price', 'Margin', 'Stock', 'Reorder', 'Velocity', 'Status', ''].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={11} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
            ) : !products.length ? (
              <TableRow><TableCell colSpan={11} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No products found</Typography></TableCell></TableRow>
            ) : products.map((p: any) => {
              const stockPct = p.inventory.maxStock > 0 ? (p.inventory.currentStock / p.inventory.maxStock) * 100 : 0;
              const isLow = p.inventory.currentStock <= p.inventory.reorderPoint;
              return (
                <TableRow key={p._id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  <TableCell><Typography variant="body2" fontFamily="monospace" fontSize={11}>{p.sku}</Typography></TableCell>
                  <TableCell sx={{ maxWidth: 180 }}><Typography variant="body2" noWrap>{p.name}</Typography></TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell>{fmt(p.pricing.costPrice)}</TableCell>
                  <TableCell>{fmt(p.pricing.sellingPrice)}</TableCell>
                  <TableCell sx={{ color: p.pricing.margin >= 20 ? 'success.main' : p.pricing.margin >= 10 ? 'warning.main' : 'error.main' }}>
                    {pct(p.pricing.margin)}
                  </TableCell>
                  <TableCell sx={{ minWidth: 120 }}>
                    <Box>
                      <Typography variant="body2" color={isLow ? 'error.main' : 'text.primary'} fontWeight={isLow ? 600 : 400}>
                        {p.inventory.currentStock}
                      </Typography>
                      <LinearProgress variant="determinate" value={Math.min(stockPct, 100)}
                        color={stockPct < 20 ? 'error' : stockPct < 40 ? 'warning' : 'success'}
                        sx={{ height: 4, borderRadius: 2, mt: 0.25 }} />
                    </Box>
                  </TableCell>
                  <TableCell>{p.inventory.reorderPoint}</TableCell>
                  <TableCell><Chip label={p.metrics.velocityCategory} color={VELOCITY_COLOR[p.metrics.velocityCategory]} size="small" /></TableCell>
                  <TableCell><Chip label={p.isActive ? 'Active' : 'Inactive'} color={p.isActive ? 'success' : 'default'} size="small" variant="outlined" /></TableCell>
                  <TableCell>
                    <Tooltip title="Adjust Stock">
                      <IconButton size="small" color="primary" onClick={() => { setStockDialog({ id: p._id, name: p.name, current: p.inventory.currentStock }); }}>
                        <TuneIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(p)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Deactivate">
                      <IconButton size="small" color="error" onClick={() => setDeleteId(p._id)}><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      {pagination.pages > 1 && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Pagination count={pagination.pages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
        </Box>
      )}

      {/* Create/Edit Product Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? 'Edit Product' : 'New Product'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>Basic Info</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
              <TextField label="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required />
              <TextField label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })} fullWidth required disabled={!!editId} />
              <TextField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} fullWidth required />
              <TextField label="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} fullWidth />
              <TextField label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} fullWidth />
              <FormControlLabel control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />} label="Active" />
            </Box>
            <TextField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={2} fullWidth />

            <Typography variant="subtitle2" fontWeight={600}>Pricing</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
              <TextField label="Cost Price" type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} fullWidth required inputProps={{ min: 0 }} />
              <TextField label="Selling Price" type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} fullWidth required inputProps={{ min: 0 }} />
              <TextField label="Tax Rate (%)" type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} fullWidth inputProps={{ min: 0 }} />
            </Box>
            {parseFloat(form.sellingPrice) > 0 && (
              <Typography variant="body2" color={parseFloat(margin()) >= 20 ? 'success.main' : 'warning.main'}>
                Margin: {margin()}%
              </Typography>
            )}

            <Typography variant="subtitle2" fontWeight={600}>Inventory</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2 }}>
              <TextField label="Current Stock" type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} fullWidth inputProps={{ min: 0 }} />
              <TextField label="Reorder Point" type="number" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })} fullWidth inputProps={{ min: 0 }} />
              <TextField label="Reorder Qty" type="number" value={form.reorderQuantity} onChange={(e) => setForm({ ...form, reorderQuantity: e.target.value })} fullWidth inputProps={{ min: 0 }} />
              <TextField label="Max Stock" type="number" value={form.maxStock} onChange={(e) => setForm({ ...form, maxStock: e.target.value })} fullWidth inputProps={{ min: 0 }} />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={createProduct.isPending || updateProduct.isPending}>
            {createProduct.isPending || updateProduct.isPending ? <CircularProgress size={18} /> : editId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stock Adjust Dialog */}
      <Dialog open={!!stockDialog} onClose={() => setStockDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Adjust Stock — {stockDialog?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">Current stock: <strong>{stockDialog?.current}</strong></Typography>
            <TextField
              label="Adjustment (positive = add, negative = remove)"
              type="number"
              value={stockAdj}
              onChange={(e) => setStockAdj(e.target.value)}
              fullWidth
              helperText={`New stock: ${(stockDialog?.current ?? 0) + (parseInt(stockAdj) || 0)}`}
            />
            <TextField label="Reason (optional)" value={stockReason} onChange={(e) => setStockReason(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleStockAdjust} disabled={adjustStock.isPending || !stockAdj}>
            {adjustStock.isPending ? <CircularProgress size={18} /> : 'Apply'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Deactivate Product?</DialogTitle>
        <DialogContent><Typography>Product will be marked inactive and hidden from new sales.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteProduct.isPending}>Deactivate</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
