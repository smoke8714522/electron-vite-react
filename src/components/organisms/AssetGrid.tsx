import React from 'react';
import { Box, Grid } from '@mui/material';
// import NewAssetCard from '../molecules/NewAssetCard'; // Old temp import
import AssetCard from '../molecules/AssetCard'; // Final import

// No props needed for static layout yet
// interface AssetGridProps {}

const AssetGrid: React.FC = () => {
  // Placeholder data for layout
  const items = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', height: '100%' }}>
      <Grid container spacing={2}>
        {items.map((id) => (
          // Responsive Grid Items: 1 on xs, 2 on sm, 3 on md, 6 on lg
          <Grid item key={id} xs={12} sm={6} md={4} lg={2}>
            {/* <NewAssetCard id={id} /> */}
            <AssetCard id={id} /> { /* Final component */ }
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AssetGrid; 