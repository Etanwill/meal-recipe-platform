import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import RecipeList from '../components/recipes/RecipeList';

const RecipesPage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Recipe Library
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Discover and learn to cook amazing dishes
        </Typography>
      </Box>

      <RecipeList />
    </Container>
  );
};

export default RecipesPage;