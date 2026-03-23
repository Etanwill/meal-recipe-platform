import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Stepper,
  Step,
  StepLabel,
  Grid,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Divider,
  Alert,
  Card,
  CardContent,
  CardMedia,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import orderService from '../../services/orderService';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const steps = ['Delivery Details', 'Review Order', 'Confirmation'];

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, getCartTotal, clearCart } = useCart();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deliveryDetails, setDeliveryDetails] = useState({
    address: '',
    phone: '',
    notes: '',
    paymentMethod: 'cash',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Redirect if cart is empty
    if (cartItems.length === 0 && activeStep === 0) {
      navigate('/cart');
    }
  }, [cartItems, activeStep, navigate]);

  const validateDeliveryDetails = () => {
    const newErrors = {};
    
    if (!deliveryDetails.address.trim()) {
      newErrors.address = 'Delivery address is required';
    }
    
    if (!deliveryDetails.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(deliveryDetails.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Invalid phone number';
    }
    
    return newErrors;
  };

  const handleNext = () => {
    if (activeStep === 0) {
      const validationErrors = validateDeliveryDetails();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
    }
    
    if (activeStep === 1) {
      handlePlaceOrder();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    
    try {
      const orderData = {
        items: cartItems.map(item => ({
          meal_id: item.id,
          quantity: item.quantity,
        })),
        delivery_address: deliveryDetails.address,
        delivery_phone: deliveryDetails.phone,
        notes: deliveryDetails.notes,
      };
      
      const response = await orderService.createOrder(orderData);
      
      if (response.status === 'success') {
        clearCart();
        setActiveStep(2);
        toast.success('Order placed successfully!');
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      const message = error.response?.data?.message || 'Failed to place order';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setDeliveryDetails(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const calculateOrderTotal = () => {
    const subtotal = getCartTotal();
    const deliveryFee = 2.99;
    const tax = subtotal * 0.08;
    return subtotal + deliveryFee + tax;
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Delivery Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  multiline
                  rows={3}
                  label="Delivery Address"
                  value={deliveryDetails.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  error={!!errors.address}
                  helperText={errors.address}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Phone Number"
                  value={deliveryDetails.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  error={!!errors.phone}
                  helperText={errors.phone}
                  placeholder="+1234567890"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Delivery Notes (Optional)"
                  value={deliveryDetails.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Special instructions, gate code, etc."
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Payment Method</FormLabel>
                  <RadioGroup
                    value={deliveryDetails.paymentMethod}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                  >
                    <FormControlLabel
                      value="cash"
                      control={<Radio />}
                      label="Cash on Delivery"
                    />
                    <FormControlLabel
                      value="card"
                      control={<Radio />}
                      label="Credit/Debit Card"
                      disabled
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Your Order
            </Typography>
            
            {/* Order Items */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                Order Items ({cartItems.length})
              </Typography>
              {cartItems.map((item) => (
                <Card key={item.id} sx={{ mb: 2 }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                    <CardMedia
                      component="img"
                      sx={{ width: 80, height: 80, borderRadius: 1, mr: 2 }}
                      image={item.image_url || '/meal-placeholder.jpg'}
                      alt={item.name}
                    />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1">{item.name}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Chip label={item.category} size="small" />
                        <Typography variant="body2" color="text.secondary">
                          Quantity: {item.quantity}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="subtitle1">
                      {formatCurrency((item.final_price || item.price) * item.quantity)}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {/* Delivery Details */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                Delivery Details
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Address:</strong> {deliveryDetails.address}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Phone:</strong> {deliveryDetails.phone}
                </Typography>
                {deliveryDetails.notes && (
                  <Typography variant="body1">
                    <strong>Notes:</strong> {deliveryDetails.notes}
                  </Typography>
                )}
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <strong>Payment Method:</strong> {deliveryDetails.paymentMethod === 'cash' ? 'Cash on Delivery' : 'Credit Card'}
                </Typography>
              </Paper>
            </Box>

            {/* Order Summary */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Order Summary
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Subtotal</Typography>
                  <Typography>{formatCurrency(getCartTotal())}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Delivery Fee</Typography>
                  <Typography>{formatCurrency(2.99)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography>Tax (8%)</Typography>
                  <Typography>{formatCurrency(getCartTotal() * 0.08)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(calculateOrderTotal())}
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h4" color="primary" gutterBottom>
              Order Confirmed! 🎉
            </Typography>
            <Typography variant="h6" gutterBottom>
              Thank you for your order!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Your order has been successfully placed and is being processed.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              You will receive a confirmation email shortly. You can track your order status in your order history.
            </Typography>
            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                <strong>Estimated Delivery:</strong> 30-45 minutes
                <br />
                <strong>Payment:</strong> {deliveryDetails.paymentMethod === 'cash' ? 'Cash on Delivery' : 'Credit Card'}
              </Typography>
            </Alert>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
              <Button
                variant="contained"
                onClick={() => navigate('/orders')}
              >
                View Order History
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/meals')}
              >
                Continue Shopping
              </Button>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mt: 4 }}>
          {getStepContent(activeStep)}
        </Box>

        {activeStep < 2 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
            >
              {activeStep === steps.length - 2 ? 'Place Order' : 'Next'}
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Checkout;