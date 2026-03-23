import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  ShoppingCart as ShoppingCartIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  LocalShipping as ShippingIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import mealService from '../../services/mealService';
import orderService from '../../services/orderService';
import LoadingSpinner from '../common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

const VendorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMeals: 0,
    availableMeals: 0,
    totalOrders: 0,
    pendingOrders: 0,
    revenue: 0,
    averageRating: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockMeals, setLowStockMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch meals
      const mealsResponse = await mealService.getMeals({ per_page: 100 });
      if (mealsResponse.status === 'success') {
        const vendorMeals = mealsResponse.data.meals.filter(
          meal => meal.vendor_id === user?.id
        );
        
        const availableMeals = vendorMeals.filter(meal => meal.is_available);
        const totalRating = vendorMeals.reduce((sum, meal) => sum + meal.rating, 0);
        const avgRating = vendorMeals.length > 0 ? totalRating / vendorMeals.length : 0;
        
        const lowStock = vendorMeals
          .filter(meal => meal.stock_quantity <= 10 && meal.stock_quantity > 0)
          .sort((a, b) => a.stock_quantity - b.stock_quantity)
          .slice(0, 5);
        
        setLowStockMeals(lowStock);
        
        setStats(prev => ({
          ...prev,
          totalMeals: vendorMeals.length,
          availableMeals: availableMeals.length,
          averageRating: avgRating,
        }));
      }
      
      // Fetch orders
      const ordersResponse = await orderService.getOrders({ per_page: 10 });
      if (ordersResponse.status === 'success') {
        const vendorOrders = ordersResponse.data.orders;
        const pendingOrders = vendorOrders.filter(order => 
          ['pending', 'confirmed', 'preparing'].includes(order.status)
        ).length;
        
        const revenue = vendorOrders.reduce((sum, order) => sum + order.total_amount, 0);
        
        setRecentOrders(vendorOrders.slice(0, 5));
        
        setStats(prev => ({
          ...prev,
          totalOrders: vendorOrders.length,
          pendingOrders,
          revenue,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <TimeIcon color="warning" />;
      case 'confirmed':
        return <CheckIcon color="info" />;
      case 'preparing':
        return <RestaurantIcon color="primary" />;
      case 'ready':
        return <ShippingIcon color="secondary" />;
      case 'delivered':
        return <CheckIcon color="success" />;
      case 'cancelled':
        return <CancelIcon color="error" />;
      default:
        return <TimeIcon />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'info';
      case 'preparing': return 'primary';
      case 'ready': return 'secondary';
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Vendor Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Welcome back, {user?.first_name}! Here's your business overview.
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.light', mr: 2 }}>
                  <RestaurantIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {stats.totalMeals}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Meals
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(stats.availableMeals / Math.max(stats.totalMeals, 1)) * 100}
                sx={{ height: 4, borderRadius: 2 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {stats.availableMeals} available
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'success.light', mr: 2 }}>
                  <ShoppingCartIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {stats.totalOrders}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Orders
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(stats.pendingOrders / Math.max(stats.totalOrders, 1)) * 100}
                color="warning"
                sx={{ height: 4, borderRadius: 2 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {stats.pendingOrders} pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'info.light', mr: 2 }}>
                  <MoneyIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {formatCurrency(stats.revenue)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Revenue
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="caption" color="success.main">
                  +12% from last month
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.light', mr: 2 }}>
                  <TrendingUpIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {stats.averageRating.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average Rating
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {[...Array(5)].map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 16,
                      height: 16,
                      bgcolor: i < Math.floor(stats.averageRating) ? 'warning.main' : 'grey.300',
                      borderRadius: '50%',
                      mr: 0.5,
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Orders */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Recent Orders
              </Typography>
              <Button
                size="small"
                onClick={() => navigate('/vendor/orders')}
              >
                View All
              </Button>
            </Box>
            {recentOrders.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                No recent orders
              </Typography>
            ) : (
              <List>
                {recentOrders.map((order, index) => (
                  <React.Fragment key={order.id}>
                    <ListItem>
                      <ListItemAvatar>
                        {getStatusIcon(order.status)}
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" fontWeight="medium">
                              {order.order_number}
                            </Typography>
                            <Chip
                              label={order.status}
                              size="small"
                              color={getStatusColor(order.status)}
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {order.customer_name}
                            </Typography>
                            <Typography variant="caption" fontWeight="medium">
                              {formatCurrency(order.total_amount)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < recentOrders.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Low Stock Meals */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Low Stock Alert
              </Typography>
              <Button
                size="small"
                onClick={() => navigate('/vendor/meals')}
              >
                Manage
              </Button>
            </Box>
            {lowStockMeals.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                All meals have sufficient stock
              </Typography>
            ) : (
              <List>
                {lowStockMeals.map((meal, index) => (
                  <React.Fragment key={meal.id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar
                          src={meal.image_url || '/meal-placeholder.jpg'}
                          alt={meal.name}
                        />
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" noWrap>
                            {meal.name}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Chip
                              label={`${meal.stock_quantity} left`}
                              size="small"
                              color={meal.stock_quantity <= 5 ? 'error' : 'warning'}
                            />
                            <Typography variant="caption">
                              {formatCurrency(meal.final_price)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < lowStockMeals.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<RestaurantIcon />}
                  onClick={() => navigate('/vendor/meals/create')}
                  sx={{ height: 80 }}
                >
                  Add New Meal
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ShoppingCartIcon />}
                  onClick={() => navigate('/vendor/orders')}
                  sx={{ height: 80 }}
                >
                  View Orders
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RestaurantIcon />}
                  onClick={() => navigate('/vendor/meals')}
                  sx={{ height: 80 }}
                >
                  Manage Meals
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<TrendingUpIcon />}
                  onClick={() => navigate('/meals')}
                  sx={{ height: 80 }}
                >
                  Browse Marketplace
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default VendorDashboard;