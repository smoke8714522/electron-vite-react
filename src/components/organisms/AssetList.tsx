import React, { useCallback, CSSProperties } from 'react';
import { Box, Alert, Typography, Skeleton } from '@mui/material';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList } from 'react-window';
import AssetCard from '../molecules/AssetCard'; // Assuming AssetCard can be used in list view too
import { useSelection, useAppActions } from '../../store/filterStore';
import type { Asset } from '../../types/api';

// Type for the itemData prop passed to FixedSizeList
interface ListItemData {
  items: Asset[];
  // Add other data needed by the Row component if necessary
}

// Define props interface
interface AssetListProps {
  assets: Asset[] | null | undefined;
  loading: boolean;
  error: string | null;
}

const ROW_HEIGHT = 80; // Adjust based on AssetCard's list representation height + spacing

const AssetList: React.FC<AssetListProps> = ({ assets, loading, error }) => {
  const selectedIds = useSelection();
  const { toggleSelected, setSelected } = useAppActions();

  const handleAssetClick = useCallback(
    (assetId: number, event: React.MouseEvent) => {
      if (event.ctrlKey || event.metaKey) {
        toggleSelected(assetId);
      } else {
        setSelected([assetId]);
        // TODO: Handle single click for opening Preview Modal
        console.log(`Single click on asset ${assetId} in list view`);
      }
    },
    [toggleSelected, setSelected],
  );

  // --- List Row Renderer ---
  const Row = useCallback(
    ({ index, style, data }: {
      index: number;
      style: CSSProperties;
      data: ListItemData;
    }) => {
      const { items } = data;
      const asset = items[index];

      if (!asset) {
        return null; // Should not happen
      }

      return (
        <Box
          style={style}
          sx={{
            display: 'flex',
            alignItems: 'center', // Vertically center content in the row
            padding: theme => theme.spacing(0.5, 2), // Adjust padding for list view
            borderBottom: theme => `1px solid ${theme.palette.divider}`, // Optional row separator
            '&:hover': { // Optional hover effect
                backgroundColor: theme => theme.palette.action.hover,
            }
          }}
        >
          {/* Render AssetCard or a specific list item component here */}
          <AssetCard
            asset={asset}
            isSelected={selectedIds.has(asset.id)}
            onClick={event => handleAssetClick(asset.id, event)}
            // You might need a different display mode for AssetCard in list view,
            // or create a dedicated AssetListItem component.
            // For now, we reuse AssetCard. Adjust ROW_HEIGHT accordingly.
            // displayMode="list" // Example prop if AssetCard supports it
          />
        </Box>
      );
    },
    [selectedIds, handleAssetClick],
  );

  // --- Loading State ---
  if (loading) {
    return (
      <Box sx={{ flexGrow: 1, p: 2, height: '100%' }}>
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={`skeleton-list-${index}`} variant="rectangular" height={ROW_HEIGHT - 8} sx={{ mb: 1 }} />
        ))}
      </Box>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error fetching assets: {error}
      </Alert>
    );
  }

  // --- Empty State ---
  if (!assets || assets.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 4, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <Typography variant="h6">No assets found.</Typography>
        <Typography>Try adjusting filters or use the Bulk Import button.</Typography>
      </Box>
    );
  }

  // --- Virtualized List ---
  return (
    <Box sx={{ flexGrow: 1, height: '100%', width: '100%', overflow: 'hidden' }}>
      <AutoSizer>
        {({ height, width }) => (
          <FixedSizeList
            height={height}
            itemCount={assets.length}
            itemSize={ROW_HEIGHT}
            width={width}
            itemData={{ items: assets }} // Pass assets to the Row component
          >
            {Row}
          </FixedSizeList>
        )}
      </AutoSizer>
    </Box>
  );
};

export default AssetList; 