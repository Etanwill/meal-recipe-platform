import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import mealService from '../../services/mealService';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const CreateEditMeal = () => {
  const { mealId } = useParams();
  const isEditMode = !!mealId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    discount_price: '',
    stock_quantity: '0',
    image_url: '',
    is_available: true,
  });
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    fetchCategories();
    
    if (isEditMode) {
      fetchMealDetails();
    }
  }, [mealId]);

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

  const fetchMealDetails = async () => {
    try {
      setLoading(true);
      const response = await mealService.getMealById(mealId);
      
      if (response.status === 'success') {
        const meal = response.data;
        setFormData({
          name: meal.name,
          description: meal.description,
          category: meal.category,
          price: meal.price.toString(),
          discount_price: meal.discount_price?.toString() || '',
          stock_quantity: meal.stock_quantity.toString(),
          image_url: meal.image_url || '',
          is_available: meal.is_available,
        });
        if (meal.image_url) {
          setImagePreview(meal.image_url);
        }
      } else {
        navigate('/vendor/meals');
      }
    } catch (error) {
      console.error('Failed to fetch meal details:', error);
      toast.error('Failed to load meal details');
      navigate('/vendor/meals');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Meal name is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }
    
    if (formData.discount_price) {
      const price = parseFloat(formData.price);
      const discount = parseFloat(formData.discount_price);
      if (discount >= price) {
        newErrors.discount_price = 'Discount price must be less than regular price';
      }
      if (discount <= 0) {
        newErrors.discount_price = 'Discount price must be positive';
      }
    }
    
    if (formData.stock_quantity && parseInt(formData.stock_quantity) < 0) {
      newErrors.stock_quantity = 'Stock quantity cannot be negative';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setSaving(true);
    
    try {
      const mealData = {
        ...formData,
        price: parseFloat(formData.price),
        discount_price: formData.discount_price ? parseFloat(formData.discount_price) : null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
      };
      
      let response;
      if (isEditMode) {
        response = await mealService.updateMeal(mealId, mealData);
      } else {
        response = await mealService.createMeal(mealData);
      }
      
      if (response.status === 'success') {
        toast.success(isEditMode ? 'Meal updated successfully' : 'Meal created successfully');
        navigate('/vendor/meals');
      }
    } catch (error) {
      console.error('Failed to save meal:', error);
      const message = error.response?.data?.message || 'Failed to save meal';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageUrlChange = (url) => {
    handleChange('image_url', url);
    setImagePreview(url);
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/vendor/meals')}
        sx={{ mb: 3 }}
      >
        Back to Meals
      </Button>

      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          {isEditMode ? 'Edit Meal' : 'Create New Meal'}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {isEditMode ? 'Update your meal details' : 'Add a new meal to your menu'}
        </Typography>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Meal Name */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Meal Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                required
                placeholder="e.g., Spaghetti Carbonara"
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                error={!!errors.description}
                helperText={errors.description}
                required
                placeholder="Describe your meal..."
              />
            </Grid>

            {/* Category and Image URL */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={!!errors.category}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={(e) => handleChange('category', e.target.value)}
                >
                  <MenuItem value="">Select Category</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
                {errors.category && (
                  <Typography variant="caption" color="error">
                    {errors.category}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Image URL"
                value={formData.image_url}
                onChange={(e) => handleImageUrlChange(e.target.value)}
                placeholder="https://example.com/meal-image.jpg"
              />
            </Grid>

            {/* Price Fields */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Regular Price ($)"
                type="number"
                value={formData.price}
                onChange={(e) => handleChange('price', e.target.value)}
                error={!!errors.price}
                helperText={errors.price}
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
                value={formData.discount_price}
                onChange={(e) => handleChange('discount_price', e.target.value)}
                error={!!errors.discount_price}
                helperText={errors.discount_price}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                }}
              />
            </Grid>

            {/* Stock Quantity */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Stock Quantity"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => handleChange('stock_quantity', e.target.value)}
                error={!!errors.stock_quantity}
                helperText={errors.stock_quantity}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>

            {/* Availability */}
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_available}
                    onChange={(e) => handleChange('is_available', e.target.checked)}
                  />
                }
                label="Available for Order"
                sx={{ mt: 2 }}
              />
            </Grid>

            {/* Image Preview */}
            {imagePreview && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Image Preview
                </Alert>
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 300,
                    height: 200,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onError={() => setImagePreview('/meal-placeholder.jpg')}
                  />
                </Box>
              </Grid>
            )}

            {/* Notes */}
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Note:</strong> 
                  {isEditMode 
                    ? ' Updating a meal will affect existing orders. Consider creating a new meal instead of major changes.'
                    : ' New meals will be immediately available for customers to order (if marked as available).'
                  }
                </Typography>
              </Alert>
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/vendor/meals')}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : (isEditMode ? 'Update Meal' : 'Create Meal')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default CreateEditMeal;