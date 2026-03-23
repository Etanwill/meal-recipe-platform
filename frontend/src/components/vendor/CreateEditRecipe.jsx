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
import recipeService from '../../services/recipeService';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const CreateEditRecipe = () => {
  const { recipeId } = useParams();
  const isEditMode = !!recipeId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ingredients: '',
    steps: '',
    category: '',
    prep_time: '',
    cook_time: '',
    servings: '',
    difficulty: 'medium',
    image_url: '',
    video_url: '',
    is_featured: false,
  });
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    fetchCategories();
    
    if (isEditMode) {
      fetchRecipeDetails();
    }
  }, [recipeId]);

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

  const fetchRecipeDetails = async () => {
    try {
      setLoading(true);
      const response = await recipeService.getRecipeById(recipeId);
      
      if (response.status === 'success') {
        const recipe = response.data;
        setFormData({
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          category: recipe.category,
          prep_time: recipe.prep_time?.toString() || '',
          cook_time: recipe.cook_time?.toString() || '',
          servings: recipe.servings?.toString() || '',
          difficulty: recipe.difficulty || 'medium',
          image_url: recipe.image_url || '',
          video_url: recipe.video_url || '',
          is_featured: recipe.is_featured || false,
        });
        if (recipe.image_url) {
          setImagePreview(recipe.image_url);
        }
      } else {
        navigate('/vendor/recipes');
      }
    } catch (error) {
      console.error('Failed to fetch recipe details:', error);
      toast.error('Failed to load recipe details');
      navigate('/vendor/recipes');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Recipe title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.ingredients.trim()) {
      newErrors.ingredients = 'Ingredients are required';
    }
    
    if (!formData.steps.trim()) {
      newErrors.steps = 'Steps are required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (formData.prep_time && parseInt(formData.prep_time) < 0) {
      newErrors.prep_time = 'Prep time cannot be negative';
    }
    
    if (formData.cook_time && parseInt(formData.cook_time) < 0) {
      newErrors.cook_time = 'Cook time cannot be negative';
    }
    
    if (formData.servings && parseInt(formData.servings) <= 0) {
      newErrors.servings = 'Servings must be positive';
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
      const recipeData = {
        ...formData,
        prep_time: formData.prep_time ? parseInt(formData.prep_time) : null,
        cook_time: formData.cook_time ? parseInt(formData.cook_time) : null,
        servings: formData.servings ? parseInt(formData.servings) : null,
      };
      
      let response;
      if (isEditMode) {
        response = await recipeService.updateRecipe(recipeId, recipeData);
      } else {
        response = await recipeService.createRecipe(recipeData);
      }
      
      if (response.status === 'success') {
        toast.success(isEditMode ? 'Recipe updated successfully' : 'Recipe created successfully');
        navigate('/vendor/recipes');
      }
    } catch (error) {
      console.error('Failed to save recipe:', error);
      const message = error.response?.data?.message || 'Failed to save recipe';
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
        onClick={() => navigate('/vendor/recipes')}
        sx={{ mb: 3 }}
      >
        Back to Recipes
      </Button>

      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          {isEditMode ? 'Edit Recipe' : 'Create New Recipe'}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {isEditMode ? 'Update your recipe details' : 'Add a new recipe to your collection'}
        </Typography>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Recipe Title */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Recipe Title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                error={!!errors.title}
                helperText={errors.title}
                required
                placeholder="e.g., Classic Pancakes"
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                error={!!errors.description}
                helperText={errors.description}
                required
                placeholder="Describe your recipe..."
              />
            </Grid>

            {/* Ingredients */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Ingredients (one per line)"
                value={formData.ingredients}
                onChange={(e) => handleChange('ingredients', e.target.value)}
                error={!!errors.ingredients}
                helperText={errors.ingredients}
                required
                placeholder="1 cup flour&#10;2 eggs&#10;1 cup milk"
              />
            </Grid>

            {/* Steps */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Steps (one per line)"
                value={formData.steps}
                onChange={(e) => handleChange('steps', e.target.value)}
                error={!!errors.steps}
                helperText={errors.steps}
                required
                placeholder="1. Mix dry ingredients&#10;2. Add wet ingredients&#10;3. Cook on medium heat"
              />
            </Grid>

            {/* Category and Difficulty */}
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
              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={formData.difficulty}
                  label="Difficulty"
                  onChange={(e) => handleChange('difficulty', e.target.value)}
                >
                  <MenuItem value="easy">Easy</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="hard">Hard</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Time and Servings */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Prep Time (minutes)"
                type="number"
                value={formData.prep_time}
                onChange={(e) => handleChange('prep_time', e.target.value)}
                error={!!errors.prep_time}
                helperText={errors.prep_time}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Cook Time (minutes)"
                type="number"
                value={formData.cook_time}
                onChange={(e) => handleChange('cook_time', e.target.value)}
                error={!!errors.cook_time}
                helperText={errors.cook_time}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Servings"
                type="number"
                value={formData.servings}
                onChange={(e) => handleChange('servings', e.target.value)}
                error={!!errors.servings}
                helperText={errors.servings}
                InputProps={{ inputProps: { min: 1 } }}
              />
            </Grid>

            {/* Image and Video URLs */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Image URL"
                value={formData.image_url}
                onChange={(e) => handleImageUrlChange(e.target.value)}
                placeholder="https://example.com/recipe-image.jpg"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Video URL (optional)"
                value={formData.video_url}
                onChange={(e) => handleChange('video_url', e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
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
                    onError={() => setImagePreview('/recipe-placeholder.jpg')}
                  />
                </Box>
              </Grid>
            )}

            {/* Featured Switch */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_featured}
                    onChange={(e) => handleChange('is_featured', e.target.checked)}
                  />
                }
                label="Mark as Featured Recipe"
              />
            </Grid>

            {/* Tips */}
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Tips:</strong>
                  <br />• Write ingredients one per line
                  <br />• Write steps in order, one per line
                  <br />• Use Unsplash for free high-quality food images
                  <br />• Featured recipes appear prominently on the homepage
                </Typography>
              </Alert>
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/vendor/recipes')}
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
                  {saving ? 'Saving...' : (isEditMode ? 'Update Recipe' : 'Create Recipe')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default CreateEditRecipe;