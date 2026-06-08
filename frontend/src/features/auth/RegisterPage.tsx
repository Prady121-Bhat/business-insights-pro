import { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, Stepper, Step, StepLabel, Divider, Link, InputAdornment, IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, BarChart, CheckCircleOutline } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../lib/axios';

const STEPS = ['Account Details', 'Company Info'];

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', companyName: '',
  });

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register', form);
      setSuccess(true);
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors?.length) {
        setError(data.errors.map((e: any) => e.msg || e.message).join(' • '));
      } else {
        setError(data?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
        <Card sx={{ maxWidth: 420, width: '100%' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircleOutline sx={{ fontSize: 56, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} mb={1}>Check your email</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              We sent a verification link to <strong>{form.email}</strong>. Click the link to activate your account.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card sx={{ width: '100%', maxWidth: 460 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{ bgcolor: 'primary.main', borderRadius: 2, p: 0.8, display: 'flex' }}>
                <BarChart sx={{ color: '#fff', fontSize: 24 }} />
              </Box>
              <Typography variant="h6" fontWeight={700}>Business Insights Pro</Typography>
            </Box>

            <Typography variant="h5" fontWeight={700} mb={0.5}>Create account</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>Start your 14-day free trial</Typography>

            <Stepper activeStep={step} sx={{ mb: 3 }}>
              {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
            </Stepper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={step === 0 ? (e) => { e.preventDefault(); handleNext(); } : handleSubmit}>
              {step === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <TextField label="First name" fullWidth size="small" value={form.firstName} onChange={update('firstName')} required autoFocus />
                    <TextField label="Last name" fullWidth size="small" value={form.lastName} onChange={update('lastName')} required />
                  </Box>
                  <TextField label="Email address" type="email" fullWidth size="small" value={form.email} onChange={update('email')} required />
                  <TextField
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    fullWidth size="small" value={form.password} onChange={update('password')} required
                    helperText="Min 8 chars, uppercase, lowercase, number, special char"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button type="submit" variant="contained" fullWidth size="large">Continue</Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label="Company name" fullWidth size="small" value={form.companyName} onChange={update('companyName')} helperText="Optional — you can join an existing company later" autoFocus />
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button onClick={handleBack} fullWidth variant="outlined" size="large">Back</Button>
                    <Button type="submit" variant="contained" fullWidth disabled={loading} size="large">
                      {loading ? 'Creating…' : 'Create account'}
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2.5 }} />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" underline="hover" fontWeight={600}>Sign in</Link>
            </Typography>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
};
