import React from 'react';
import { Container, Grid, Paper, Typography, Box } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import MealList from '../components/customer/MealList';

const CustomerDashboard = () => {
  const { user } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome, {user?.first_name}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse delicious meals from our vendors
        </Typography>
      </Box>

      <MealList />
    </Container>
  );
};

export default CustomerDashboard;