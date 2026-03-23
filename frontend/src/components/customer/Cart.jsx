import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Grid,
  Divider,
  Chip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ShoppingCart as ShoppingCartIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import EmptyState from '../common/EmptyState';
import toast from 'react-hot-toast';

const Cart = () => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getItemCount,
  } = useCart();
  const navigate = useNavigate();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleQuantityChange = (mealId, newQuantity) => {
    const meal = cartItems.find(item => item.id === mealId);
    if (!meal) return;

    if (newQuantity > meal.stock_quantity) {
      toast.error(`Only ${meal.stock_quantity} items available in stock`);
      return;
    }

    updateQuantity(mealId, newQuantity);
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (cartItems.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <EmptyState
          title="Your cart is empty"
          description="Add some delicious meals to get started!"
          icon={ShoppingCartIcon}
          actionLabel="Browse Meals"
          onAction={() => navigate('/meals')}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={4}>
        {/* Cart Items */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5">
                Shopping Cart ({getItemCount()} items)
              </Typography>
              <Button
                color="error"
                onClick={clearCart}
                startIcon={<DeleteIcon />}
              >
                Clear Cart
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="center">Quantity</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cartItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <img
                            src={item.image_url || '/meal-placeholder.jpg'}
                            alt={item.name}
                            style={{
                              width: 60,
                              height: 60,
                              objectFit: 'cover',
                              borderRadius: 8,
                            }}
                          />
                          <Box>
                            <Typography variant="subtitle1" noWrap sx={{ maxWidth: 200 }}>
                              {item.name}
                            </Typography>
                            <Chip
                              label={item.category}
                              size="small"
                              sx={{ mt: 0.5 }}
                            />
                            {item.has_discount && (
                              <Chip
                                label="Discount"
                                size="small"
                                color="success"
                                variant="outlined"
                                sx={{ mt: 0.5, ml: 0.5 }}
                              />
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1">
                          {formatCurrency(item.final_price || item.price)}
                        </Typography>
                        {item.has_discount && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ textDecoration: 'line-through' }}
                          >
                            {formatCurrency(item.price)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <RemoveIcon />
                          </IconButton>
                          <TextField
                            value={item.quantity}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 1;
                              handleQuantityChange(item.id, value);
                            }}
                            inputProps={{
                              min: 1,
                              max: item.stock_quantity,
                              style: { textAlign: 'center', width: 60 },
                            }}
                            variant="outlined"
                            size="small"
                          />
                          <IconButton
                            size="small"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock_quantity}
                          >
                            <AddIcon />
                          </IconButton>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Max: {item.stock_quantity}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight="bold">
                          {formatCurrency((item.final_price || item.price) * item.quantity)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          color="error"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Button
            component={RouterLink}
            to="/meals"
            startIcon={<ArrowBackIcon />}
          >
            Continue Shopping
          </Button>
        </Grid>

        {/* Order Summary */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>

            <Box sx={{ my: 2 }}>
              {cartItems.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {item.name} × {item.quantity}
                  </Typography>
                  <Typography variant="body2">
                    {formatCurrency((item.final_price || item.price) * item.quantity)}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Subtotal</Typography>
                <Typography>{formatCurrency(getCartTotal())}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Delivery Fee</Typography>
                <Typography>{formatCurrency(2.99)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Tax (8%)</Typography>
                <Typography>{formatCurrency(getCartTotal() * 0.08)}</Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Total</Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(getCartTotal() + 2.99 + getCartTotal() * 0.08)}
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleCheckout}
              sx={{ mb: 2 }}
            >
              Proceed to Checkout
            </Button>

            <Typography variant="body2" color="text.secondary" align="center">
              By placing your order, you agree to our Terms of Service
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Cart;