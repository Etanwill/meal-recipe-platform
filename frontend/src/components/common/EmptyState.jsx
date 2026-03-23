import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add, SearchOff } from '@mui/icons-material';

const EmptyState = ({ 
  title = 'No data found', 
  description = 'There are no items to display.',
  actionLabel,
  onAction,
  icon: Icon = SearchOff 
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        textAlign: 'center',
      }}
    >
      <Icon
        sx={{
          fontSize: 64,
          color: 'text.secondary',
          mb: 2,
        }}
      />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {description}
      </Typography>
      {actionLabel && onAction && (
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAction}
          sx={{ mt: 2 }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;