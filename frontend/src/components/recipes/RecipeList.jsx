import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Stack,
  Rating,
} from '@mui/material';
import { Search, Timer, Restaurant, FilterList } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import recipeService from '../../services/recipeService';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';

const RecipeList = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [difficulties, setDifficulties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    difficulty: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 12,
    total: 0,
    total_pages: 1,
  });

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        ...filters,
      };
      
      const response = await recipeService.getRecipes(params);
      
      if (response.status === 'success') {
        setRecipes(response.data.recipes);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await recipeService.getCategories();
      if (response.status === 'success') {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchDifficulties = async () => {
    try {
      const response = await recipeService.getDifficulties();
      if (response.status === 'success') {
        setDifficulties(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch difficulties:', error);
    }
  };

  useEffect(() => {
    fetchRecipes();
    fetchCategories();
    fetchDifficulties();
  }, [filters, pagination.page]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (event, value) => {
    setPagination(prev => ({ ...prev, page: value }));
  };

  const handleViewRecipe = (recipeId) => {
    navigate(`/recipes/${recipeId}`);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  if (loading && !recipes.length) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Recipe Library
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Discover delicious recipes to try at home
        </Typography>
        
        <Grid container spacing={2} alignItems="center" sx={{ mt: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search recipes..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.category}
                label="Category"
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={filters.difficulty}
                label="Difficulty"
                onChange={(e) => handleFilterChange('difficulty', e.target.value)}
              >
                <MenuItem value="">All Levels</MenuItem>
                {difficulties.map((difficulty) => (
                  <MenuItem key={difficulty} value={difficulty}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {!loading && !recipes.length ? (
        <EmptyState
          title="No recipes found"
          description="Try adjusting your search filters"
          icon={Restaurant}
        />
      ) : (
        <>
          <Grid container spacing={3}>
            {recipes.map((recipe) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={recipe.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      cursor: 'pointer',
                    },
                  }}
                  onClick={() => handleViewRecipe(recipe.id)}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={recipe.image_url || '/recipe-placeholder.jpg'}
                    alt={recipe.title}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip
                        label={recipe.category}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={recipe.difficulty}
                        size="small"
                        color={getDifficultyColor(recipe.difficulty)}
                      />
                    </Box>
                    <Typography variant="h6" component="h3" gutterBottom noWrap>
                      {recipe.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph sx={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {recipe.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Timer fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {recipe.prep_time + (recipe.cook_time || 0)} min
                        </Typography>
                      </Box>
                      {recipe.servings && (
                        <Typography variant="body2" color="text.secondary">
                          {recipe.servings} servings
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="contained"
                    >
                      View Recipe
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {pagination.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={pagination.total_pages}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default RecipeList;