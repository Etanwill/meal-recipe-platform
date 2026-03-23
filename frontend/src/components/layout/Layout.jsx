import React, { useState } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Container,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ShoppingCart as ShoppingCartIcon,
  Restaurant as RestaurantIcon,
  MenuBook as MenuBookIcon,
  Dashboard as DashboardIcon,
  LocalShipping as OrdersIcon,
  AccountCircle as AccountIcon,
  ExitToApp as LogoutIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const Layout = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, getUserRole } = useAuth();
  const { getItemCount } = useCart();

  const userRole = getUserRole();

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavItems = () => {
  const commonItems = [
    { label: 'Home', icon: <HomeIcon />, path: '/' },
    { label: 'Recipes', icon: <MenuBookIcon />, path: '/recipes' },
  ];

  if (userRole === 'customer') {
    return [
      ...commonItems,
      { label: 'Meals', icon: <RestaurantIcon />, path: '/meals' },
      { label: 'Cart', icon: <ShoppingCartIcon />, path: '/cart', badge: getItemCount() },
      { label: 'Orders', icon: <OrdersIcon />, path: '/orders' },
    ];
  } else if (userRole === 'vendor') {
    return [
      ...commonItems,
      { label: 'Dashboard', icon: <DashboardIcon />, path: '/vendor/dashboard' },
      { label: 'My Meals', icon: <RestaurantIcon />, path: '/vendor/meals' },
      { label: 'My Recipes', icon: <MenuBookIcon />, path: '/vendor/recipes' }, // ADD THIS LINE
      { label: 'Orders', icon: <OrdersIcon />, path: '/vendor/orders' },
    ];
  }

  return commonItems;
};

  const drawerList = () => (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <AccountIcon />
        <Box>
          <Typography variant="subtitle1">
            {user?.first_name} {user?.last_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {userRole === 'customer' ? 'Customer' : 'Vendor'}
          </Typography>
        </Box>
      </Box>
      <Divider />
      <List>
        {getNavItems().map((item) => (
          <ListItem
            button
            key={item.label}
            onClick={() => navigate(item.path)}
            selected={location.pathname === item.path}
          >
            <ListItemIcon>
              {item.badge ? (
                <Badge badgeContent={item.badge} color="primary">
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )}
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem button onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            MealOrder
          </Typography>
          
          {/* Cart icon for customers */}
          {userRole === 'customer' && (
            <IconButton
              size="large"
              color="inherit"
              onClick={() => navigate('/cart')}
            >
              <Badge badgeContent={getItemCount()} color="secondary">
                <ShoppingCartIcon />
              </Badge>
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        {drawerList()}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>

      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: (theme) => theme.palette.grey[100],
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} MealOrder Platform. All rights reserved.
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            Delicious meals and recipes at your fingertips
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;