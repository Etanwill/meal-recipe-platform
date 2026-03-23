import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Link,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const steps = ['Enter Email', 'Verify OTP', 'Reset Password'];

const ForgotPassword = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      setErrors({ email: 'Email is required' });
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await forgotPassword(formData.email);
      
      if (result.success) {
        setActiveStep(1);
      }
    } catch (error) {
      console.error('Send OTP error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    
    if (!formData.otp) {
      setErrors({ otp: 'OTP is required' });
      return;
    }
    
    setActiveStep(2);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    const validationErrors = {};
    
    if (!formData.newPassword) {
      validationErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      validationErrors.newPassword = 'Password must be at least 8 characters';
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      validationErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await resetPassword(
        formData.email,
        formData.otp,
        formData.newPassword
      );
      
      if (result.success) {
        navigate('/login');
      }
    } catch (error) {
      console.error('Reset password error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <form onSubmit={handleSendOtp}>
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              margin="normal"
              required
              autoComplete="email"
            />

            <Alert severity="info" sx={{ my: 2 }}>
              We'll send a 6-digit OTP to your email to reset your password.
            </Alert>

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mb: 3 }}
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Button>
          </form>
        );

      case 1:
        return (
          <form onSubmit={handleVerifyOtp}>
            <TextField
              fullWidth
              label="OTP Code"
              name="otp"
              value={formData.otp}
              onChange={handleChange}
              error={!!errors.otp}
              helperText={errors.otp}
              margin="normal"
              required
              inputProps={{ maxLength: 6 }}
            />

            <Alert severity="info" sx={{ my: 2 }}>
              Enter the 6-digit OTP sent to {formData.email}
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
          </form>
        );

      case 2:
        return (
          <form onSubmit={handleResetPassword}>
            <TextField
              fullWidth
              label="New Password"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
              error={!!errors.newPassword}
              helperText={errors.newPassword}
              margin="normal"
              required
              autoComplete="new-password"
            />

            <TextField
              fullWidth
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              margin="normal"
              required
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mb: 3 }}
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom color="primary">
            Reset Password
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Follow the steps to reset your password
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {getStepContent(activeStep)}

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Link
            component={RouterLink}
            to="/login"
            color="primary"
            fontWeight="bold"
          >
            Back to Login
          </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default ForgotPassword;