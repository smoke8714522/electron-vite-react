import React from 'react';
import { Box } from '@mui/material';
import FilterSidebar from '../components/organisms/FilterSidebar';
import LibraryToolbar from '../components/organisms/LibraryToolbar';
import AssetGrid from '../components/organisms/AssetGrid';

const LibraryView: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexGrow: 1, width: '100%' }}>
      <FilterSidebar />
      <Box
        component="main"
        sx={{
          width: '100%',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <LibraryToolbar />
        <AssetGrid />
      </Box>
    </Box>
  );
};

export default LibraryView;