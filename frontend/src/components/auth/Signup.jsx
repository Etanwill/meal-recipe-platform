import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const Signup = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    role: 'customer',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const { register, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.first_name) {
      newErrors.first_name = 'First name is required';
    }
    
    if (!formData.last_name) {
      newErrors.last_name = 'Last name is required';
    }
    
    return newErrors;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await register(formData);
      
      if (result.success) {
        if (result.requiresVerification) {
          setOtpSent(true);
        } else {
          navigate('/login');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    
    if (!otp) {
      setErrors(prev => ({ ...prev, otp: 'OTP is required' }));
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await verifyOtp(formData.email, otp);
      
      if (result.success) {
        navigate('/');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (otpSent) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom color="primary">
              Verify Your Email
            </Typography>
            <Typography variant="body1" color="text.secondary">
              We've sent an OTP to {formData.email}
            </Typography>
          </Box>

          <form onSubmit={handleVerifyOtp}>
            <TextField
              fullWidth
              label="OTP Code"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value);
                if (errors.otp) {
                  setErrors(prev => ({ ...prev, otp: '' }));
                }
              }}
              error={!!errors.otp}
              helperText={errors.otp}
              margin="normal"
              required
              inputProps={{ maxLength: 6 }}
            />

            <Alert severity="info" sx={{ my: 2 }}>
              Check your email for the 6-digit OTP code. It will expire in 10 minutes.
            </Alert>

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              sx={{ mb: 3 }}
            >
              Verify OTP
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Didn't receive the OTP?{' '}
                <Link
                  component="button"
                  type="button"
                  color="primary"
                  onClick={() => setOtpSent(false)}
                >
                  Try Again
                </Link>
              </Typography>
            </Box>
          </form>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom color="primary">
            Create Account
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Join our meal ordering platform
          </Typography>
        </Box>

        <form onSubmit={handleRegister}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                error={!!errors.first_name}
                helperText={errors.first_name}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                error={!!errors.last_name}
                helperText={errors.last_name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                required
                autoComplete="email"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password}
                required
                autoComplete="new-password"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Account Type</InputLabel>
                <Select
                  name="role"
                  value={formData.role}
                  label="Account Type"
                  onChange={handleChange}
                >
                  <MenuItem value="customer">Customer</MenuItem>
                  <MenuItem value="vendor">Vendor</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 3, mb: 2 }}>
            {formData.role === 'customer'
              ? 'As a customer, you can browse meals, place orders, and view recipes.'
              : 'As a vendor, you can create and manage meals, and handle orders.'}
          </Alert>

          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ my: 3 }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link
                component={RouterLink}
                to="/login"
                color="primary"
                fontWeight="bold"
              >
                Sign In
              </Link>
            </Typography>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default Signup;