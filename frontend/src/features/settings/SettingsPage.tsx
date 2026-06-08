import {
  Box, Typography, Tabs, Tab, Paper, TextField, Button, Switch,
  FormControlLabel, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert, Divider, Avatar, IconButton, Tooltip,
  Chip, Stack, InputAdornment,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PaletteIcon from '@mui/icons-material/Palette';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SaveIcon from '@mui/icons-material/Save';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useState, useEffect, useRef } from 'react';
import { useSettings, useUpdateSection, useUpdateCompany, useUploadLogo, useDeleteLogo } from './hooks/useSettings';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { showSnackbar } from '../../app/uiSlice';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'SGD', 'CHF', 'HKD'];
const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Kolkata', 'Australia/Sydney'];
const DATE_FORMATS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: 'text.primary' }}>
      {children}
    </Typography>
  );
}

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const { data, isLoading } = useSettings();
  const [tab, setTab] = useState(0);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Local form states per section
  const [company, setCompany] = useState<any>({});
  const [business, setBusiness] = useState<any>({});
  const [branding, setBranding] = useState<any>({});
  const [notifications, setNotifications] = useState<any>({});
  const [analytics, setAnalytics] = useState<any>({});
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    if (!data) return;
    setCompany(data.company ?? {});
    setBusiness(data.settings?.business ?? {});
    setBranding(data.settings?.branding ?? {});
    setNotifications(data.settings?.notifications ?? {});
    setAnalytics(data.settings?.analytics ?? {});
  }, [data]);

  const updateCompany = useUpdateCompany();
  const updateBusiness = useUpdateSection('business');
  const updateBranding = useUpdateSection('branding');
  const updateNotifications = useUpdateSection('notifications');
  const updateAnalytics = useUpdateSection('analytics');
  const uploadLogo = useUploadLogo();
  const deleteLogo = useDeleteLogo();

  const save = async (mutFn: any, payload: any, label: string) => {
    try {
      await mutFn.mutateAsync(payload);
      dispatch(showSnackbar({ message: `${label} saved`, severity: 'success' }));
    } catch (e: any) {
      dispatch(showSnackbar({ message: e.response?.data?.message ?? 'Save failed', severity: 'error' }));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadLogo.mutateAsync(file);
      dispatch(showSnackbar({ message: 'Logo uploaded', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Logo upload failed', severity: 'error' }));
    }
  };

  const addAlertEmail = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) return;
    const current = notifications.alertEmails ?? [];
    if (current.includes(trimmed)) return;
    setNotifications({ ...notifications, alertEmails: [...current, trimmed] });
    setNewEmail('');
  };

  const removeAlertEmail = (email: string) => {
    setNotifications({ ...notifications, alertEmails: (notifications.alertEmails ?? []).filter((e: string) => e !== email) });
  };

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  const logoUrl = branding.logo ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') ?? 'http://localhost:5000'}${branding.logo}` : null;

  return (
    <Box sx={{ p: 3, maxWidth: 860, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>Settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Manage company profile, branding, analytics, and notification preferences.</Typography>

      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab icon={<BusinessIcon fontSize="small" />} iconPosition="start" label="Company" />
          <Tab icon={<PaletteIcon fontSize="small" />} iconPosition="start" label="Branding" />
          <Tab icon={<NotificationsIcon fontSize="small" />} iconPosition="start" label="Notifications" />
          <Tab icon={<AnalyticsIcon fontSize="small" />} iconPosition="start" label="Analytics" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* ── Company ── */}
          <TabPanel value={tab} index={0}>
            <SectionTitle>Company Profile</SectionTitle>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
              <TextField label="Company Name" value={company.name ?? ''} onChange={(e) => setCompany({ ...company, name: e.target.value })} fullWidth />
              <TextField label="Email" value={company.email ?? ''} onChange={(e) => setCompany({ ...company, email: e.target.value })} fullWidth />
              <TextField label="Phone" value={company.phone ?? ''} onChange={(e) => setCompany({ ...company, phone: e.target.value })} fullWidth />
              <TextField label="Website" value={company.website ?? ''} onChange={(e) => setCompany({ ...company, website: e.target.value })} fullWidth />
            </Box>

            <SectionTitle>Address</SectionTitle>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
              <TextField label="Street" value={company.address?.street ?? ''} onChange={(e) => setCompany({ ...company, address: { ...company.address, street: e.target.value } })} fullWidth sx={{ gridColumn: '1/-1' }} />
              <TextField label="City" value={company.address?.city ?? ''} onChange={(e) => setCompany({ ...company, address: { ...company.address, city: e.target.value } })} fullWidth />
              <TextField label="State / Province" value={company.address?.state ?? ''} onChange={(e) => setCompany({ ...company, address: { ...company.address, state: e.target.value } })} fullWidth />
              <TextField label="Country" value={company.address?.country ?? ''} onChange={(e) => setCompany({ ...company, address: { ...company.address, country: e.target.value } })} fullWidth />
              <TextField label="Zip / Postal Code" value={company.address?.zipCode ?? ''} onChange={(e) => setCompany({ ...company, address: { ...company.address, zipCode: e.target.value } })} fullWidth />
            </Box>

            <Divider sx={{ my: 3 }} />
            <SectionTitle>Regional Settings</SectionTitle>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select value={business.currency ?? 'USD'} label="Currency" onChange={(e) => setBusiness({ ...business, currency: e.target.value })}>
                  {CURRENCIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select value={business.timezone ?? 'UTC'} label="Timezone" onChange={(e) => setBusiness({ ...business, timezone: e.target.value })}>
                  {TIMEZONES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Date Format</InputLabel>
                <Select value={business.dateFormat ?? 'MM/DD/YYYY'} label="Date Format" onChange={(e) => setBusiness({ ...business, dateFormat: e.target.value })}>
                  {DATE_FORMATS.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Fiscal Year Start</InputLabel>
                <Select value={business.fiscalYearStart ?? 1} label="Fiscal Year Start" onChange={(e) => setBusiness({ ...business, fiscalYearStart: Number(e.target.value) })}>
                  {MONTHS.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                label="Tax Rate (%)"
                type="number"
                value={business.taxRate ?? 0}
                onChange={(e) => setBusiness({ ...business, taxRate: parseFloat(e.target.value) })}
                inputProps={{ min: 0, max: 100, step: 0.01 }}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                fullWidth
              />
              <TextField
                label="Tax Name"
                value={business.taxName ?? 'Tax'}
                onChange={(e) => setBusiness({ ...business, taxName: e.target.value })}
                fullWidth
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={() => { save(updateCompany, { name: company.name, email: company.email, phone: company.phone, website: company.website, address: company.address }, 'Company'); save(updateBusiness, business, 'Business settings'); }} disabled={updateCompany.isPending || updateBusiness.isPending}>
                Save Changes
              </Button>
            </Box>
          </TabPanel>

          {/* ── Branding ── */}
          <TabPanel value={tab} index={1}>
            <SectionTitle>Logo</SectionTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar src={logoUrl ?? undefined} variant="rounded" sx={{ width: 80, height: 80, bgcolor: 'action.hover' }}>
                <BusinessIcon sx={{ fontSize: 36, color: 'text.disabled' }} />
              </Avatar>
              <Box>
                <input ref={logoInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.svg" style={{ display: 'none' }} onChange={handleLogoUpload} />
                <Button variant="outlined" startIcon={uploadLogo.isPending ? <CircularProgress size={14} /> : <UploadIcon />} onClick={() => logoInputRef.current?.click()} disabled={uploadLogo.isPending}>
                  Upload Logo
                </Button>
                {logoUrl && (
                  <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => deleteLogo.mutate()} sx={{ ml: 1 }} disabled={deleteLogo.isPending}>
                    Remove
                  </Button>
                )}
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                  JPG, PNG, WebP or SVG — max 2 MB
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />
            <SectionTitle>Brand Colors</SectionTitle>
            <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Primary Color</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input
                    type="color"
                    value={branding.primaryColor ?? '#1976D2'}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    style={{ width: 48, height: 40, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 4 }}
                  />
                  <TextField
                    size="small"
                    value={branding.primaryColor ?? '#1976D2'}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    inputProps={{ pattern: '^#[0-9A-Fa-f]{6}$' }}
                    sx={{ width: 120, fontFamily: 'monospace' }}
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Secondary / Accent</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input
                    type="color"
                    value={branding.secondaryColor ?? '#DC004E'}
                    onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                    style={{ width: 48, height: 40, border: 'none', padding: 0, cursor: 'pointer', borderRadius: 4 }}
                  />
                  <TextField
                    size="small"
                    value={branding.secondaryColor ?? '#DC004E'}
                    onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                    inputProps={{ pattern: '^#[0-9A-Fa-f]{6}$' }}
                    sx={{ width: 120, fontFamily: 'monospace' }}
                  />
                </Box>
              </Box>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              Color changes apply to reports and email templates. The app UI uses the system theme.
            </Alert>

            <Button variant="contained" startIcon={<SaveIcon />} onClick={() => save(updateBranding, branding, 'Branding')} disabled={updateBranding.isPending}>
              Save Branding
            </Button>
          </TabPanel>

          {/* ── Notifications ── */}
          <TabPanel value={tab} index={2}>
            <SectionTitle>Alert Emails</SectionTitle>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Alerts and weekly digests are sent to these addresses.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, minHeight: 36 }}>
              {(notifications.alertEmails ?? []).map((email: string) => (
                <Chip key={email} label={email} onDelete={() => removeAlertEmail(email)} size="small" />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <TextField
                size="small"
                label="Add email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAlertEmail()}
                sx={{ width: 280 }}
              />
              <Button variant="outlined" startIcon={<AddIcon />} onClick={addAlertEmail}>Add</Button>
            </Box>

            <Divider sx={{ my: 2 }} />
            <SectionTitle>Alert Types</SectionTitle>
            <Stack spacing={0.5} sx={{ mb: 3 }}>
              <FormControlLabel
                control={<Switch checked={notifications.lowInventoryAlert ?? true} onChange={(e) => setNotifications({ ...notifications, lowInventoryAlert: e.target.checked })} />}
                label="Low Inventory Alerts"
              />
              <FormControlLabel
                control={<Switch checked={notifications.churnRiskAlert ?? true} onChange={(e) => setNotifications({ ...notifications, churnRiskAlert: e.target.checked })} />}
                label="Customer Churn Risk Alerts"
              />
              <FormControlLabel
                control={<Switch checked={notifications.weeklyDigest ?? true} onChange={(e) => setNotifications({ ...notifications, weeklyDigest: e.target.checked })} />}
                label="Weekly Digest Email (Monday 9 AM UTC)"
              />
              <FormControlLabel
                control={<Switch checked={notifications.monthlyReport ?? true} onChange={(e) => setNotifications({ ...notifications, monthlyReport: e.target.checked })} />}
                label="Monthly Report Email"
              />
            </Stack>

            <Divider sx={{ my: 2 }} />
            <SectionTitle>Thresholds</SectionTitle>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
              <TextField
                label="Revenue Drop Alert Threshold"
                type="number"
                value={notifications.revenueDropThreshold ?? 20}
                onChange={(e) => setNotifications({ ...notifications, revenueDropThreshold: parseFloat(e.target.value) })}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                helperText="Alert when revenue drops by this % week-over-week"
                fullWidth
              />
            </Box>

            <Button variant="contained" startIcon={<SaveIcon />} onClick={() => save(updateNotifications, notifications, 'Notification settings')} disabled={updateNotifications.isPending}>
              Save Notifications
            </Button>
          </TabPanel>

          {/* ── Analytics ── */}
          <TabPanel value={tab} index={3}>
            <SectionTitle>Forecasting Defaults</SectionTitle>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Default Algorithm</InputLabel>
                <Select value={analytics.forecastAlgorithm ?? 'exponential_smoothing'} label="Default Algorithm" onChange={(e) => setAnalytics({ ...analytics, forecastAlgorithm: e.target.value })}>
                  <MenuItem value="linear_regression">Linear Regression</MenuItem>
                  <MenuItem value="moving_average">Moving Average</MenuItem>
                  <MenuItem value="exponential_smoothing">Exponential Smoothing</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Forecast Horizon (days)"
                type="number"
                value={analytics.forecastHorizon ?? 90}
                onChange={(e) => setAnalytics({ ...analytics, forecastHorizon: parseInt(e.target.value) })}
                inputProps={{ min: 7, max: 365 }}
                fullWidth
              />
            </Box>

            <Divider sx={{ my: 2 }} />
            <SectionTitle>Customer Intelligence</SectionTitle>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
              <TextField
                label="Churn Threshold (days)"
                type="number"
                value={analytics.churnThresholdDays ?? 90}
                onChange={(e) => setAnalytics({ ...analytics, churnThresholdDays: parseInt(e.target.value) })}
                helperText="Days since last purchase before customer is flagged at-risk"
                fullWidth
              />
              <TextField
                label="Low Inventory Threshold"
                type="number"
                value={analytics.lowInventoryThreshold ?? 10}
                onChange={(e) => setAnalytics({ ...analytics, lowInventoryThreshold: parseInt(e.target.value) })}
                helperText="Stock count at which low-inventory alert triggers"
                fullWidth
              />
            </Box>

            <Divider sx={{ my: 2 }} />
            <SectionTitle>RFM Weights</SectionTitle>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Must sum to 1.0. Used for customer scoring (Recency, Frequency, Monetary).
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 3 }}>
              {(['recency', 'frequency', 'monetary'] as const).map((dim) => (
                <TextField
                  key={dim}
                  label={dim.charAt(0).toUpperCase() + dim.slice(1)}
                  type="number"
                  value={analytics.rfmWeights?.[dim] ?? 0.33}
                  onChange={(e) => setAnalytics({ ...analytics, rfmWeights: { ...analytics.rfmWeights, [dim]: parseFloat(e.target.value) } })}
                  inputProps={{ min: 0, max: 1, step: 0.05 }}
                  fullWidth
                />
              ))}
            </Box>

            <Button variant="contained" startIcon={<SaveIcon />} onClick={() => save(updateAnalytics, analytics, 'Analytics settings')} disabled={updateAnalytics.isPending}>
              Save Analytics
            </Button>
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}
