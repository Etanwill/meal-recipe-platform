import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Rating,
  TextField,
  Divider,
  Avatar,
  Alert,
} from '@mui/material';
import { AddShoppingCart, Share, Favorite, Star } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import mealService from '../../services/mealService';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import toast from 'react-hot-toast';

const MealDetail = () => {
  const { mealId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [meal, setMeal] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
  });

  useEffect(() => {
    fetchMealDetails();
  }, [mealId]);

  const fetchMealDetails = async () => {
    try {
      setLoading(true);
      const response = await mealService.getMealById(mealId);
      
      if (response.status === 'success') {
        setMeal(response.data);
        setReviews(response.data.reviews || []);
      } else {
        navigate('/meals');
      }
    } catch (error) {
      console.error('Failed to fetch meal details:', error);
      toast.error('Failed to load meal details');
      navigate('/meals');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!meal) return;
    
    if (quantity > meal.stock_quantity) {
      toast.error(`Only ${meal.stock_quantity} items available in stock`);
      return;
    }
    
    // Add item to cart with selected quantity
    const mealToAdd = { ...meal };
    for (let i = 0; i < quantity; i++) {
      addToCart(mealToAdd);
    }
    
    toast.success(`Added ${quantity} ${meal.name}(s) to cart`);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!reviewForm.comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    
    try {
      const response = await mealService.addReview(mealId, reviewForm);
      
      if (response.status === 'success') {
        toast.success('Review submitted successfully');
        setReviewForm({ rating: 5, comment: '' });
        fetchMealDetails(); // Refresh reviews
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error('Failed to submit review');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!meal) {
    return (
      <EmptyState
        title="Meal not found"
        description="The meal you're looking for doesn't exist or has been removed."
      />
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={4}>
        {/* Meal Image */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              height: '100%',
              minHeight: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              borderRadius: 2,
            }}
          >
            <img
              src={meal.image_url || '/meal-placeholder.jpg'}
              alt={meal.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Paper>
        </Grid>

        {/* Meal Details */}
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Chip label={meal.category} color="primary" />
              {!meal.is_available && (
                <Chip label="Out of Stock" color="error" />
              )}
            </Box>
            
            <Typography variant="h4" component="h1" gutterBottom>
              {meal.name}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Rating value={meal.rating} precision={0.5} readOnly />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                ({meal.total_reviews} reviews)
              </Typography>
            </Box>
            
            <Typography variant="body1" color="text.secondary" paragraph>
              {meal.description}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Vendor: {meal.vendor_name}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Stock Available: {meal.stock_quantity}
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Typography variant="h3" color="primary">
                {formatCurrency(meal.final_price)}
              </Typography>
              {meal.has_discount && (
                <>
                  <Typography
                    variant="h5"
                    color="text.secondary"
                    sx={{ textDecoration: 'line-through' }}
                  >
                    {formatCurrency(meal.price)}
                  </Typography>
                  <Chip
                    label={`Save ${formatCurrency(meal.price - meal.final_price)}`}
                    color="success"
                    size="small"
                  />
                </>
              )}
            </Box>

            {meal.is_available && meal.stock_quantity > 0 ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <TextField
                    label="Quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const value = Math.max(1, parseInt(e.target.value) || 1);
                      setQuantity(Math.min(value, meal.stock_quantity));
                    }}
                    InputProps={{ inputProps: { min: 1, max: meal.stock_quantity } }}
                    sx={{ width: 100 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Max: {meal.stock_quantity}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddShoppingCart />}
                  onClick={handleAddToCart}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Add to Cart
                </Button>
              </Box>
            ) : (
              <Alert severity="error" sx={{ mb: 2 }}>
                This meal is currently out of stock.
              </Alert>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Favorite />}
              disabled
            >
              Save
            </Button>
            <Button
              variant="outlined"
              startIcon={<Share />}
              disabled
            >
              Share
            </Button>
          </Box>
        </Grid>

        {/* Reviews Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Customer Reviews ({reviews.length})
            </Typography>

            {/* Add Review Form */}
            <Box component="form" onSubmit={handleSubmitReview} sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Write a Review
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography component="legend">Your Rating</Typography>
                <Rating
                  value={reviewForm.rating}
                  onChange={(e, newValue) => {
                    setReviewForm(prev => ({ ...prev, rating: newValue }));
                  }}
                />
              </Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Your Review"
                value={reviewForm.comment}
                onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <Button type="submit" variant="contained">
                Submit Review
              </Button>
            </Box>

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <EmptyState
                title="No reviews yet"
                description="Be the first to review this meal!"
                icon={Star}
              />
            ) : (
              <Box>
                {reviews.map((review) => (
                  <Box key={review.id} sx={{ mb: 3, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Avatar sx={{ mr: 2 }}>
                        {review.user_name?.[0]?.toUpperCase() || 'U'}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1">
                          {review.user_name || 'Anonymous'}
                        </Typography>
                        <Rating value={review.rating} size="small" readOnly />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(review.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                    {review.comment && (
                      <Typography variant="body1" color="text.secondary">
                        {review.comment}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default MealDetail;