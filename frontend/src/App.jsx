import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';
import { Box } from '@mui/material';
// Add these imports at the top
import RecipeManagement from './components/vendor/RecipeManagement';
import CreateEditRecipe from './components/vendor/CreateEditRecipe';

// Theme
import theme from './theme';

// Context Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Layout Components
import Layout from './components/layout/Layout';

// Auth Pages
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import ForgotPassword from './components/auth/ForgotPassword';

// Customer Pages
import HomePage from './pages/HomePage';
import CustomerDashboard from './pages/CustomerDashboard';
import MealDetail from './components/customer/MealDetail';
import Cart from './components/customer/Cart';
import Checkout from './components/customer/Checkout';
import OrderHistory from './components/customer/OrderHistory';

// Vendor Pages
import VendorDashboard from './pages/VendorDashboard';
import MealManagement from './components/vendor/MealManagement';
import CreateEditMeal from './components/vendor/CreateEditMeal';
import VendorOrders from './components/vendor/VendorOrders';

// Recipe Pages
import RecipesPage from './pages/RecipesPage';
import RecipeDetail from './components/recipes/RecipeDetail';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading, isAuthenticated, getUserRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        Loading...
      </Box>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && getUserRole() !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        Loading...
      </Box>
    );
  }

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { getUserRole } = useAuth();
  const userRole = getUserRole();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Signup />
        </PublicRoute>
      } />
      <Route path="/forgot-password" element={
        <PublicRoute>
          <ForgotPassword />
        </PublicRoute>
      } />

      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      } />

      {/* Customer Routes */}
      <Route path="/meals" element={
        <ProtectedRoute requiredRole="customer">
          <CustomerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/meals/:mealId" element={
        <ProtectedRoute>
          <MealDetail />
        </ProtectedRoute>
      } />
      <Route path="/cart" element={
        <ProtectedRoute requiredRole="customer">
          <Cart />
        </ProtectedRoute>
      } />
      <Route path="/checkout" element={
        <ProtectedRoute requiredRole="customer">
          <Checkout />
        </ProtectedRoute>
      } />
      <Route path="/orders" element={
        <ProtectedRoute requiredRole="customer">
          <OrderHistory />
        </ProtectedRoute>
      } />

      {/* Vendor Routes */}
      <Route path="/vendor/dashboard" element={
        <ProtectedRoute requiredRole="vendor">
          <VendorDashboard />
        </ProtectedRoute>
      } />
      <Route path="/vendor/meals" element={
        <ProtectedRoute requiredRole="vendor">
          <MealManagement />
        </ProtectedRoute>
      } />
      <Route path="/vendor/meals/create" element={
        <ProtectedRoute requiredRole="vendor">
          <CreateEditMeal />
        </ProtectedRoute>
      } />
      <Route path="/vendor/meals/edit/:mealId" element={
        <ProtectedRoute requiredRole="vendor">
          <CreateEditMeal />
        </ProtectedRoute>
      } />
      <Route path="/vendor/orders" element={
        <ProtectedRoute requiredRole="vendor">
          <VendorOrders />
        </ProtectedRoute>
      } />

      {/* Recipe Routes (accessible to all authenticated users) */}
      <Route path="/recipes" element={
        <ProtectedRoute>
          <RecipesPage />
        </ProtectedRoute>
      } />
      <Route path="/recipes/:recipeId" element={
        <ProtectedRoute>
          <RecipeDetail />
        </ProtectedRoute>
      } />

      {/* 404 Route */}
      <Route path="*" element={<Navigate to="/" replace />} />

      <Route path="/vendor/recipes" element={
  <ProtectedRoute requiredRole="vendor">
    <RecipeManagement />
  </ProtectedRoute>
} />
<Route path="/vendor/recipes/create" element={
  <ProtectedRoute requiredRole="vendor">
    <CreateEditRecipe />
  </ProtectedRoute>
} />
<Route path="/vendor/recipes/edit/:recipeId" element={
  <ProtectedRoute requiredRole="vendor">
    <CreateEditRecipe />
  </ProtectedRoute>
} />
    </Routes>
  );
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <CartProvider>
            <Layout>
              <AppRoutes />
            </Layout>
          </CartProvider>
        </AuthProvider>
      </Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: theme.palette.background.paper,
            color: theme.palette.text.primary,
            boxShadow: theme.shadows[3],
          },
          success: {
            iconTheme: {
              primary: theme.palette.success.main,
              secondary: theme.palette.success.contrastText,
            },
          },
          error: {
            iconTheme: {
              primary: theme.palette.error.main,
              secondary: theme.palette.error.contrastText,
            },
          },
        }}
      />
    </ThemeProvider>
  );
};

export default App;