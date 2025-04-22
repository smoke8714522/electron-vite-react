import React, { useEffect, useState, useCallback } from 'react';
import { Box } from '@mui/material';
import FilterSidebar from '../components/organisms/FilterSidebar';
import LibraryToolbar from '../components/organisms/LibraryToolbar';
import AssetGrid from '../components/organisms/AssetGrid';
import AssetList from '../components/organisms/AssetList';
import TagEditorModal from '../components/organisms/TagEditorModal';
import { useGetAssets } from '../hooks/useApi';
import { useAssetQuery, useAppActions } from '../store/filterStore';
import type { Asset } from '../types/api';

export type ViewMode = 'grid' | 'list';

const LibraryView: React.FC = () => {
  const assetQuery = useAssetQuery();
  const { 
    call: fetchAssets, 
    loading, 
    error, 
    data: assets 
  } = useGetAssets();
  const { toggleSelected } = useAppActions();

  const [view, setView] = useState<ViewMode>('grid');
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [selectedAssetForEdit, setSelectedAssetForEdit] = useState<Asset | null>(null);

  useEffect(() => {
    console.log('LibraryView: Asset query changed, fetching assets:', assetQuery);
    fetchAssets(assetQuery);
  }, [assetQuery, fetchAssets]);

  const handleOpenTagModal = useCallback((asset: Asset) => {
    console.log('Opening tag editor for asset:', asset.id);
    setSelectedAssetForEdit(asset);
    setIsTagModalOpen(true);
  }, []);

  const handleCloseTagModal = useCallback(() => {
    setIsTagModalOpen(false);
    setSelectedAssetForEdit(null);
  }, []);

  const handleSaveTagSuccess = useCallback((updatedAsset: Partial<Asset>) => {
    console.log('TagEditorModal save success, refreshing assets.', updatedAsset);
    fetchAssets(assetQuery);
  }, [fetchAssets, assetQuery]);

  const handleAssetDataChange = useCallback(() => {
    console.log('Asset data change detected (e.g., version action), refreshing assets.');
    fetchAssets(assetQuery);
  }, [fetchAssets, assetQuery]);

  const handleAssetClick = useCallback((asset: Asset) => {
    console.log('Toggling selection for asset:', asset.id);
    toggleSelected(asset.id);
  }, [toggleSelected]);

  // New handler to open editor for a single asset ID
  const handleSingleEditClick = useCallback((assetId: number) => {
    const assetToEdit = assets?.find(a => a.id === assetId);
    if (assetToEdit) {
      handleOpenTagModal(assetToEdit);
    } else {
      console.warn(`Asset with ID ${assetId} not found for editing.`);
      // Optionally show an error to the user
    }
  }, [assets, handleOpenTagModal]);

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
          onSingleEdit={handleSingleEditClick}
        />
        {view === 'grid' ? (
          <AssetGrid 
            assets={assets} 
            loading={loading} 
            error={error} 
            onAssetClick={handleAssetClick}
            onDataChange={handleAssetDataChange}
          />
        ) : (
          <AssetList
            assets={assets}
            loading={loading}
            error={error}
          />
        )}
      </Box>

      <TagEditorModal
        asset={selectedAssetForEdit}
        open={isTagModalOpen}
        onClose={handleCloseTagModal}
        onSaveSuccess={handleSaveTagSuccess}
      />
    </Box>
  );
};

export default LibraryView;