import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const PersonalExpenses = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Gastos Personales
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Contenido de gastos personales en desarrollo...
        </Typography>
      </Paper>
    </Box>
  );
};

export default PersonalExpenses; 