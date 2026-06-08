import { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, InputAdornment, IconButton, Divider, Link,
} from '@mui/material';
import { Visibility, VisibilityOff, BarChart } from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { setCredentials } from './authSlice';
import api from '../../lib/axios';

export const LoginPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      dispatch(setCredentials(data.data));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card sx={{ width: '100%', maxWidth: 420 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{ bgcolor: 'primary.main', borderRadius: 2, p: 0.8, display: 'flex' }}>
                <BarChart sx={{ color: '#fff', fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700} lineHeight={1}>Business Insights Pro</Typography>
                <Typography variant="caption" color="text.secondary">Analytics Platform</Typography>
              </Box>
            </Box>

            <Typography variant="h5" fontWeight={700} mb={0.5}>Welcome back</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>Sign in to your account</Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Email address"
                type="email"
                fullWidth
                size="small"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoFocus
              />
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                size="small"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
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
              <Box sx={{ textAlign: 'right' }}>
                <Link component={RouterLink} to="/forgot-password" variant="caption" underline="hover">
                  Forgot password?
                </Link>
              </Box>
              <Button type="submit" variant="contained" fullWidth disabled={loading} size="large" sx={{ mt: 0.5 }}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </Box>

            <Divider sx={{ my: 2.5 }} />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Don't have an account?{' '}
              <Link component={RouterLink} to="/register" underline="hover" fontWeight={600}>Sign up</Link>
            </Typography>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
};
