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
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import mealService from '../../services/mealService';
import DataTable from '../common/DataTable';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import ConfirmationDialog from '../common/ConfirmationDialog';
import toast from 'react-hot-toast';

const MealManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meals, setMeals] = useState([]);
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
    availableOnly: false,
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [mealForm, setMealForm] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    discount_price: '',
    stock_quantity: '',
    image_url: '',
    is_available: true,
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchMeals = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        ...filters,
      };

      const response = await mealService.getMeals(params);
      
      if (response.status === 'success') {
        // Filter to show only vendor's meals
        const vendorMeals = response.data.meals.filter(
          meal => meal.vendor_id === user?.id
        );
        setMeals(vendorMeals);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch meals:', error);
      toast.error('Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await mealService.getCategories();
      if (response.status === 'success') {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMeals();
      fetchCategories();
    }
  }, [user, pagination.page, filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCreateNew = () => {
    navigate('/vendor/meals/create');
  };

  const handleEdit = (meal) => {
    setSelectedMeal(meal);
    setMealForm({
      name: meal.name,
      description: meal.description,
      category: meal.category,
      price: meal.price.toString(),
      discount_price: meal.discount_price?.toString() || '',
      stock_quantity: meal.stock_quantity.toString(),
      image_url: meal.image_url || '',
      is_available: meal.is_available,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (meal) => {
    setSelectedMeal(meal);
    setDeleteDialogOpen(true);
  };

  const handleView = (meal) => {
    navigate(`/meals/${meal.id}`);
  };

  const handleUpdateMeal = async () => {
    // Validate form
    const errors = {};
    if (!mealForm.name.trim()) errors.name = 'Name is required';
    if (!mealForm.description.trim()) errors.description = 'Description is required';
    if (!mealForm.category) errors.category = 'Category is required';
    if (!mealForm.price || parseFloat(mealForm.price) <= 0) errors.price = 'Valid price is required';
    if (mealForm.discount_price && parseFloat(mealForm.discount_price) >= parseFloat(mealForm.price)) {
      errors.discount_price = 'Discount price must be less than regular price';
    }
    if (mealForm.stock_quantity && parseInt(mealForm.stock_quantity) < 0) {
      errors.stock_quantity = 'Stock quantity cannot be negative';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const mealData = {
        ...mealForm,
        price: parseFloat(mealForm.price),
        discount_price: mealForm.discount_price ? parseFloat(mealForm.discount_price) : null,
        stock_quantity: parseInt(mealForm.stock_quantity) || 0,
      };

      const response = await mealService.updateMeal(selectedMeal.id, mealData);
      
      if (response.status === 'success') {
        toast.success('Meal updated successfully');
        setEditDialogOpen(false);
        fetchMeals();
      }
    } catch (error) {
      console.error('Failed to update meal:', error);
      const message = error.response?.data?.message || 'Failed to update meal';
      toast.error(message);
    }
  };

  const handleDeleteMeal = async () => {
    try {
      const response = await mealService.deleteMeal(selectedMeal.id);
      
      if (response.status === 'success') {
        toast.success(response.message);
        setDeleteDialogOpen(false);
        fetchMeals();
      }
    } catch (error) {
      console.error('Failed to delete meal:', error);
      const message = error.response?.data?.message || 'Failed to delete meal';
      toast.error(message);
    }
  };

  const handleFormChange = (field, value) => {
    setMealForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const columns = [
    {
      id: 'name',
      label: 'Meal Name',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <img
            src={row.image_url || '/meal-placeholder.jpg'}
            alt={row.name}
            style={{
              width: 50,
              height: 50,
              objectFit: 'cover',
              borderRadius: 4,
            }}
          />
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {row.name}
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
      id: 'price',
      label: 'Price',
      align: 'right',
      render: (row) => (
        <Box>
          <Typography variant="body2">
            {formatCurrency(row.final_price)}
          </Typography>
          {row.has_discount && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textDecoration: 'line-through' }}
            >
              {formatCurrency(row.price)}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'stock_quantity',
      label: 'Stock',
      align: 'center',
      render: (row) => (
        <Chip
          label={row.stock_quantity}
          color={row.stock_quantity > 0 ? 'success' : 'error'}
          size="small"
          icon={<InventoryIcon />}
        />
      ),
    },
    {
      id: 'rating',
      label: 'Rating',
      align: 'center',
      render: (row) => (
        <Typography variant="body2">
          {row.rating.toFixed(1)} ({row.total_reviews})
        </Typography>
      ),
    },
    {
      id: 'is_available',
      label: 'Status',
      align: 'center',
      render: (row) => (
        <Chip
          label={row.is_available ? 'Available' : 'Unavailable'}
          color={row.is_available ? 'success' : 'error'}
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

  if (loading && !meals.length) {
    return <LoadingSpinner />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Meal Management
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Manage your menu items and availability
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
        >
          Add New Meal
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search meals..."
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
            <FormControlLabel
              control={
                <Switch
                  checked={filters.availableOnly}
                  onChange={(e) => handleFilterChange('availableOnly', e.target.checked)}
                />
              }
              label="Available Only"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Meals Table */}
      {!loading && !meals.length ? (
        <EmptyState
          title="No meals found"
          description="You haven't added any meals yet."
          actionLabel="Add Your First Meal"
          onAction={handleCreateNew}
        />
      ) : (
        <DataTable
          columns={columns}
          data={meals}
          loading={loading}
          totalCount={pagination.total}
          page={pagination.page - 1}
          rowsPerPage={pagination.per_page}
          onPageChange={(newPage) => setPagination(prev => ({ ...prev, page: newPage + 1 }))}
          onRowsPerPageChange={(newRowsPerPage) => 
            setPagination(prev => ({ ...prev, per_page: newRowsPerPage, page: 1 }))
          }
          onSearch={(search) => handleFilterChange('search', search)}
          searchPlaceholder="Search meals..."
          onRefresh={fetchMeals}
        />
      )}

      {/* Edit Meal Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Edit Meal
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Meal Name"
                value={mealForm.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={mealForm.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                error={!!formErrors.description}
                helperText={formErrors.description}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={!!formErrors.category}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={mealForm.category}
                  label="Category"
                  onChange={(e) => handleFormChange('category', e.target.value)}
                >
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.category && (
                  <Typography variant="caption" color="error">
                    {formErrors.category}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Image URL"
                value={mealForm.image_url}
                onChange={(e) => handleFormChange('image_url', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Price ($)"
                type="number"
                value={mealForm.price}
                onChange={(e) => handleFormChange('price', e.target.value)}
                error={!!formErrors.price}
                helperText={formErrors.price}
                required
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Discount Price ($)"
                type="number"
                value={mealForm.discount_price}
                onChange={(e) => handleFormChange('discount_price', e.target.value)}
                error={!!formErrors.discount_price}
                helperText={formErrors.discount_price}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Stock Quantity"
                type="number"
                value={mealForm.stock_quantity}
                onChange={(e) => handleFormChange('stock_quantity', e.target.value)}
                error={!!formErrors.stock_quantity}
                helperText={formErrors.stock_quantity}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={mealForm.is_available}
                    onChange={(e) => handleFormChange('is_available', e.target.checked)}
                  />
                }
                label="Available for Order"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateMeal}
          >
            Update Meal
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        title="Delete Meal"
        message={`Are you sure you want to delete "${selectedMeal?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteMeal}
        onCancel={() => setDeleteDialogOpen(false)}
        severity="error"
      />
    </Container>
  );
};

export default MealManagement;