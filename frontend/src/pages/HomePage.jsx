import React, { useState, useEffect } from 'react';
// Add missing import
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import Timer from '@mui/icons-material/Timer';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  TextField,
  InputAdornment,
  Paper,
  alpha,
} from '@mui/material';
import {
  Search,
  Restaurant,
  LocalShipping,
  MenuBook,
  Star,
  TrendingUp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import mealService from '../services/mealService';
import recipeService from '../services/recipeService';

const HomePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, getUserRole } = useAuth();
  const [featuredMeals, setFeaturedMeals] = useState([]);
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchFeaturedContent();
  }, []);

  const fetchFeaturedContent = async () => {
    try {
      // Fetch featured meals (highly rated or discounted)
      const mealsResponse = await mealService.getMeals({
        per_page: 4,
        min_rating: 4,
        available_only: true,
      });
      
      if (mealsResponse.status === 'success') {
        setFeaturedMeals(mealsResponse.data.meals.slice(0, 4));
      }

      // Fetch featured recipes
      const recipesResponse = await recipeService.getRecipes({
        per_page: 4,
        featured_only: true,
      });
      
      if (recipesResponse.status === 'success') {
        setFeaturedRecipes(recipesResponse.data.recipes.slice(0, 4));
      }
    } catch (error) {
      console.error('Failed to fetch featured content:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/meals?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getWelcomeMessage = () => {
    if (!user) return 'Welcome to MealOrder';
    
    const name = user.first_name;
    const role = getUserRole();
    
    if (role === 'customer') {
      return `Welcome back, ${name}! Ready to order some delicious food?`;
    } else {
      return `Welcome back, ${name}! Manage your meals and orders.`;
    }
  };

  const getQuickActions = () => {
    const role = getUserRole();
    
    if (role === 'customer') {
      return [
        { label: 'Browse Meals', icon: <Restaurant />, path: '/meals' },
        { label: 'View Recipes', icon: <MenuBook />, path: '/recipes' },
        { label: 'Order History', icon: <LocalShipping />, path: '/orders' },
        { label: 'My Cart', icon: <ShoppingCartIcon />, path: '/cart' },
      ];
    } else {
      return [
        { label: 'Manage Meals', icon: <Restaurant />, path: '/vendor/meals' },
        { label: 'View Orders', icon: <LocalShipping />, path: '/vendor/orders' },
        { label: 'Dashboard', icon: <TrendingUp />, path: '/vendor/dashboard' },
        { label: 'Browse Marketplace', icon: <Search />, path: '/meals' },
      ];
    }
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: { xs: 8, md: 12 },
          mb: 6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" gutterBottom>
                Delicious Meals Delivered to Your Door
              </Typography>
              <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
                Order from the best local vendors or learn to cook amazing recipes at home
              </Typography>
              
              <Paper
                component="form"
                onSubmit={handleSearch}
                sx={{
                  p: 1,
                  display: 'flex',
                  maxWidth: 500,
                  bgcolor: 'white',
                  borderRadius: 2,
                }}
              >
                <TextField
                  fullWidth
                  placeholder="Search for meals or recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    disableUnderline: true,
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search color="action" />
                      </InputAdornment>
                    ),
                  }}
                  variant="standard"
                  sx={{ ml: 1 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  sx={{ ml: 1 }}
                >
                  Search
                </Button>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                component="img"
                src="/hero-image.png"
                alt="Delicious food"
                sx={{
                  width: '100%',
                  borderRadius: 4,
                  boxShadow: 24,
                  transform: 'rotate(2deg)',
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {/* Welcome Section */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" gutterBottom>
            {getWelcomeMessage()}
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 3 }}>
            {getQuickActions().map((action) => (
              <Grid item xs={6} sm={3} key={action.label}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={action.icon}
                  onClick={() => navigate(action.path)}
                  sx={{ py: 2 }}
                >
                  {action.label}
                </Button>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Featured Meals */}
        <Box sx={{ mb: 6 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">
              Featured Meals
            </Typography>
            <Button onClick={() => navigate('/meals')}>
              View All
            </Button>
          </Box>

          <Grid container spacing={3}>
            {featuredMeals.map((meal) => (
              <Grid item xs={12} sm={6} md={3} key={meal.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                    },
                  }}
                  onClick={() => navigate(`/meals/${meal.id}`)}
                >
                  <CardMedia
                    component="img"
                    height="160"
                    image={meal.image_url || '/meal-placeholder.jpg'}
                    alt={meal.name}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" noWrap gutterBottom>
                      {meal.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Star fontSize="small" color="warning" />
                      <Typography variant="body2" sx={{ ml: 0.5 }}>
                        {meal.rating.toFixed(1)}
                      </Typography>
                      <Chip
                        label={meal.category}
                        size="small"
                        sx={{ ml: 'auto' }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {meal.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(meal.final_price)}
                      </Typography>
                      {meal.has_discount && (
                        <Chip
                          label="Sale"
                          size="small"
                          color="success"
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Featured Recipes */}
        <Box sx={{ mb: 6 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">
              Featured Recipes
            </Typography>
            <Button onClick={() => navigate('/recipes')}>
              View All
            </Button>
          </Box>

          <Grid container spacing={3}>
            {featuredRecipes.map((recipe) => (
              <Grid item xs={12} sm={6} md={3} key={recipe.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                    },
                  }}
                  onClick={() => navigate(`/recipes/${recipe.id}`)}
                >
                  <CardMedia
                    component="img"
                    height="160"
                    image={recipe.image_url || '/recipe-placeholder.jpg'}
                    alt={recipe.title}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" noWrap gutterBottom>
                      {recipe.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Chip
                        label={recipe.difficulty}
                        size="small"
                        color={
                          recipe.difficulty === 'easy' ? 'success' :
                          recipe.difficulty === 'medium' ? 'warning' : 'error'
                        }
                      />
                      <Chip
                        label={recipe.category}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {recipe.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Timer fontSize="small" color="action" />
                        <Typography variant="body2">
                          {recipe.prep_time + (recipe.cook_time || 0)} min
                        </Typography>
                      </Box>
                      {recipe.servings && (
                        <Typography variant="body2">
                          {recipe.servings} servings
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Features Section */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Why Choose MealOrder?
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
            We bring together the best of food ordering and recipe learning in one platform
          </Typography>

          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Card sx={{ p: 3, textAlign: 'center', height: '100%' }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <Restaurant sx={{ fontSize: 40, color: 'primary.main' }} />
                </Box>
                <Typography variant="h6" gutterBottom>
                  Fresh Meals
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Order from local vendors who prepare fresh, delicious meals daily
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ p: 3, textAlign: 'center', height: '100%' }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'secondary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <MenuBook sx={{ fontSize: 40, color: 'secondary.main' }} />
                </Box>
                <Typography variant="h6" gutterBottom>
                  Learn to Cook
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Access our recipe library and learn to cook amazing dishes at home
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ p: 3, textAlign: 'center', height: '100%' }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'success.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <LocalShipping sx={{ fontSize: 40, color: 'success.main' }} />
                </Box>
                <Typography variant="h6" gutterBottom>
                  Fast Delivery
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Get your orders delivered quickly and reliably to your doorstep
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};



export default HomePage;