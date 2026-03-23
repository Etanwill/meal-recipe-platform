import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import recipeService from '../../services/recipeService';
import DataTable from '../common/DataTable';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import ConfirmationDialog from '../common/ConfirmationDialog';
import toast from 'react-hot-toast';

const RecipeManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 1,
  });
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    difficulty: '',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

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
        setRecipes(response.data.recipes || []);
        setPagination(response.data.pagination || {
          page: 1,
          per_page: 10,
          total: 0,
          total_pages: 1,
        });
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
      toast.error('Failed to load recipes');
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

  useEffect(() => {
    if (user) {
      fetchRecipes();
      fetchCategories();
    }
  }, [user, pagination.page, filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCreateNew = () => {
    navigate('/vendor/recipes/create');
  };

  const handleEdit = (recipe) => {
    navigate(`/vendor/recipes/edit/${recipe.id}`);
  };

  const handleDelete = (recipe) => {
    setSelectedRecipe(recipe);
    setDeleteDialogOpen(true);
  };

  const handleView = (recipe) => {
    navigate(`/recipes/${recipe.id}`);
  };

  const handleDeleteRecipe = async () => {
    try {
      const response = await recipeService.deleteRecipe(selectedRecipe.id);
      
      if (response.status === 'success') {
        toast.success('Recipe deleted successfully');
        setDeleteDialogOpen(false);
        fetchRecipes();
      }
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      const message = error.response?.data?.message || 'Failed to delete recipe';
      toast.error(message);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  const columns = [
    {
      id: 'title',
      label: 'Recipe Title',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <img
            src={row.image_url || '/recipe-placeholder.jpg'}
            alt={row.title}
            style={{
              width: 50,
              height: 50,
              objectFit: 'cover',
              borderRadius: 4,
            }}
          />
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {row.title}
            </Typography>
            <Chip
              label={row.category}
              size="small"
              sx={{ mt: 0.5 }}
            />
          </Box>
        </Box>
      ),
    },
    {
      id: 'difficulty',
      label: 'Difficulty',
      render: (row) => (
        <Chip
          label={row.difficulty}
          color={getDifficultyColor(row.difficulty)}
          size="small"
        />
      ),
    },
    {
      id: 'prep_time',
      label: 'Prep Time',
      render: (row) => (
        <Typography variant="body2">
          {row.prep_time ? `${row.prep_time} min` : 'N/A'}
        </Typography>
      ),
    },
    {
      id: 'cook_time',
      label: 'Cook Time',
      render: (row) => (
        <Typography variant="body2">
          {row.cook_time ? `${row.cook_time} min` : 'N/A'}
        </Typography>
      ),
    },
    {
      id: 'is_featured',
      label: 'Featured',
      align: 'center',
      render: (row) => (
        <Chip
          label={row.is_featured ? 'Yes' : 'No'}
          color={row.is_featured ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleView(row)}
            title="View"
          >
            <VisibilityIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleEdit(row)}
            title="Edit"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(row)}
            title="Delete"
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (loading && !recipes.length) {
    return <LoadingSpinner />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Recipe Management
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Create and manage your recipes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
        >
          Add New Recipe
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search recipes..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
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
            <FormControl fullWidth size="small">
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={filters.difficulty}
                label="Difficulty"
                onChange={(e) => handleFilterChange('difficulty', e.target.value)}
              >
                <MenuItem value="">All Difficulties</MenuItem>
                <MenuItem value="easy">Easy</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="hard">Hard</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Recipes Table */}
      {!loading && !recipes.length ? (
        <EmptyState
          title="No recipes found"
          description="You haven't added any recipes yet."
          actionLabel="Add Your First Recipe"
          onAction={handleCreateNew}
        />
      ) : (
        <DataTable
          columns={columns}
          data={recipes}
          loading={loading}
          totalCount={pagination.total}
          page={pagination.page - 1}
          rowsPerPage={pagination.per_page}
          onPageChange={(newPage) => setPagination(prev => ({ ...prev, page: newPage + 1 }))}
          onRowsPerPageChange={(newRowsPerPage) => 
            setPagination(prev => ({ ...prev, per_page: newRowsPerPage, page: 1 }))
          }
          onSearch={(search) => handleFilterChange('search', search)}
          searchPlaceholder="Search recipes..."
          onRefresh={fetchRecipes}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        title="Delete Recipe"
        message={`Are you sure you want to delete "${selectedRecipe?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteRecipe}
        onCancel={() => setDeleteDialogOpen(false)}
        severity="error"
      />
    </Container>
  );
};

export default RecipeManagement;