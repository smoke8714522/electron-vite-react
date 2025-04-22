import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import FilterSidebar from '../components/organisms/FilterSidebar';
import LibraryToolbar from '../components/organisms/LibraryToolbar';
import AssetGrid from '../components/organisms/AssetGrid';
import AssetList from '../components/organisms/AssetList';
import { useGetAssets } from '../hooks/useApi';
import { useAssetQuery } from '../store/filterStore';

export type ViewMode = 'grid' | 'list';

const LibraryView: React.FC = () => {
  const assetQuery = useAssetQuery();
  const { 
    call: fetchAssets, 
    loading, 
    error, 
    data: assets 
  } = useGetAssets();

  const [view, setView] = useState<ViewMode>('grid');

  useEffect(() => {
    console.log('LibraryView: Asset query changed, fetching assets:', assetQuery);
    fetchAssets(assetQuery);
  }, [assetQuery, fetchAssets]);

  return (
    <Box sx={{ display: 'flex', flexGrow: 1 }}>
      <FilterSidebar />
      <Box
        component="main"
        sx={{
          // width: '100%', // Keep this commented or removed
          flexGrow: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <LibraryToolbar 
          view={view} 
          onViewChange={setView} 
          onRefreshNeeded={fetchAssets} 
        />
        {view === 'grid' ? (
          <AssetGrid 
            assets={assets} 
            loading={loading} 
            error={error} 
          />
        ) : (
          <AssetList
            assets={assets}
            loading={loading}
            error={error}
          />
        )}
      </Box>
    </Box>
  );
};

export default LibraryView;