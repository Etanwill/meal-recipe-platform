import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Timer,
  Restaurant,
  People,
  ExpandMore,
  ExpandLess,
  PlayArrow,
  Bookmark,
  Share,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import recipeService from '../../services/recipeService';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';

const RecipeDetail = () => {
  const { recipeId } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedIngredients, setExpandedIngredients] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState(true);

  useEffect(() => {
    fetchRecipeDetails();
  }, [recipeId]);

  const fetchRecipeDetails = async () => {
    try {
      setLoading(true);
      const response = await recipeService.getRecipeById(recipeId);
      
      if (response.status === 'success') {
        setRecipe(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch recipe details:', error);
    } finally {
      setLoading(false);
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

  const parseList = (text) => {
    if (!text) return [];
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // If not JSON, split by newlines
      return text.split('\n').filter(line => line.trim());
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!recipe) {
    return (
      <EmptyState
        title="Recipe not found"
        description="The recipe you're looking for doesn't exist or has been removed."
      />
    );
  }

  const ingredients = parseList(recipe.ingredients);
  const steps = parseList(recipe.steps);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={4}>
        {/* Recipe Image and Basic Info */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              height: '100%',
              minHeight: 400,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: 2,
            }}
          >
            <Box sx={{ position: 'relative', flexGrow: 1 }}>
              <CardMedia
                component="img"
                height="400"
                image={recipe.image_url || '/recipe-placeholder.jpg'}
                alt={recipe.title}
                sx={{ objectFit: 'cover' }}
              />
              {recipe.video_url && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <IconButton
                    sx={{
                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                      '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                    }}
                    size="large"
                    onClick={() => window.open(recipe.video_url, '_blank')}
                  >
                    <PlayArrow sx={{ fontSize: 48, color: 'white' }} />
                  </IconButton>
                </Box>
              )}
            </Box>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip label={recipe.category} color="primary" />
                <Chip
                  label={recipe.difficulty}
                  color={getDifficultyColor(recipe.difficulty)}
                />
                {recipe.is_featured && (
                  <Chip label="Featured" color="secondary" />
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                {recipe.prep_time && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Timer color="action" />
                    <Typography variant="body2">
                      Prep: {recipe.prep_time} min
                    </Typography>
                  </Box>
                )}
                {recipe.cook_time && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Timer color="action" />
                    <Typography variant="body2">
                      Cook: {recipe.cook_time} min
                    </Typography>
                  </Box>
                )}
                {recipe.servings && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <People color="action" />
                    <Typography variant="body2">
                      {recipe.servings} servings
                    </Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Bookmark />}
                  size="small"
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Share />}
                  size="small"
                >
                  Share
                </Button>
              </Box>
            </CardContent>
          </Paper>
        </Grid>

        {/* Recipe Details */}
        <Grid item xs={12} md={6}>
          <Typography variant="h3" component="h1" gutterBottom>
            {recipe.title}
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            {recipe.description}
          </Typography>

          {/* Ingredients */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                cursor: 'pointer',
              }}
              onClick={() => setExpandedIngredients(!expandedIngredients)}
            >
              <Typography variant="h5">
                Ingredients
              </Typography>
              {expandedIngredients ? <ExpandLess /> : <ExpandMore />}
            </Box>
            
            <Collapse in={expandedIngredients}>
              <List dense>
                {ingredients.map((ingredient, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={ingredient}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </Paper>

          {/* Instructions */}
          <Paper sx={{ p: 3 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                cursor: 'pointer',
              }}
              onClick={() => setExpandedSteps(!expandedSteps)}
            >
              <Typography variant="h5">
                Instructions
              </Typography>
              {expandedSteps ? <ExpandLess /> : <ExpandMore />}
            </Box>
            
            <Collapse in={expandedSteps}>
              <List>
                {steps.map((step, index) => (
                  <React.Fragment key={index}>
                    <ListItem sx={{ py: 2 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Chip
                              label={`Step ${index + 1}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            <Typography variant="body1">
                              {step}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < steps.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </Collapse>
          </Paper>

          {/* Tips and Notes */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tips & Notes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • You can customize this recipe by adding your favorite vegetables or spices.
              <br />
              • For a vegetarian version, substitute meat with tofu or additional vegetables.
              <br />
              • Store leftovers in an airtight container in the refrigerator for up to 3 days.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default RecipeDetail;