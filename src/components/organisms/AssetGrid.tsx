import React, { useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  // CircularProgress, // TODO: Unused import (eslint: @typescript-eslint/no-unused-vars)
  Alert,
  Typography,
  Skeleton
} from '@mui/material';
import AssetCard from '../molecules/AssetCard';
import {
  useAssetQuery,
  useSelection,
  useAppActions
} from '../../store/filterStore';
import { useGetAssets } from '../../hooks/useApi';
// import { Asset } from '../../types/api'; // TODO: Unused import (eslint: @typescript-eslint/no-unused-vars) - Keep for type safety checks?

const AssetGrid: React.FC = () => {
  const assetQuery = useAssetQuery(); 
  const selectedIds = useSelection();
  const { toggleSelected, setSelected } = useAppActions();
  const { call: fetchAssets, loading, error, data: assets } = useGetAssets();

  useEffect(() => {
    console.log('Asset query changed, fetching assets:', assetQuery);
    fetchAssets(assetQuery);
  }, [assetQuery, fetchAssets]);

  const handleAssetClick = useCallback((assetId: number, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      toggleSelected(assetId);
    } else {
      setSelected([assetId]); 
    }
  }, [toggleSelected, setSelected]);

  if (loading) {
    return (
      <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', height: '100%' }}>
        <Grid container spacing={2}>
          {Array.from({ length: 12 }).map((_, index) => (
            <Grid item key={`skeleton-${index}`} xs={12} sm={6} md={4} lg={2}>
              <Skeleton variant="rectangular" height={140} sx={{ mb: 1 }}/>
              <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
              <Skeleton variant="text" sx={{ fontSize: '0.8rem' }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>Error fetching assets: {error}</Alert>;
  }

  if (!assets || assets.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 4, width: '100%' }}>
        <Typography variant="h6">No assets found.</Typography>
        <Typography>Try adjusting filters or use the Bulk Import button.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', height: '100%' }}>
      <Grid container spacing={2}>
        {assets.map((asset) => (
          <Grid item key={asset.id} xs={12} sm={6} md={4} lg={2}>
            <AssetCard 
              asset={asset}
              isSelected={selectedIds.has(asset.id)}
              onClick={(event) => handleAssetClick(asset.id, event)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AssetGrid; 