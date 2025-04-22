import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const SettingsView: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ pt: 4, pb: 4, width: '100%' }}>
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Typography>
          Settings content will go here.
        </Typography>
      </Box>
    </Container>
  );
};

export default SettingsView; 