import React, { useCallback, CSSProperties } from 'react';
import {
  Box,
  // CircularProgress, // TODO: Unused import (eslint: @typescript-eslint/no-unused-vars)
  Alert,
  Typography,
  Skeleton
} from '@mui/material';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeGrid } from 'react-window';
import AssetCard from '../molecules/AssetCard';
import {
  useSelection,
  useAppActions
} from '../../store/filterStore';
import type { Asset } from '../../types/api'; // Need Asset type for props
import { useAddToGroup } from '../../hooks/useApi'; // Import the hook

// Type for the itemData prop passed to FixedSizeGrid
interface GridItemData {
  items: Asset[];
  columnCount: number;
}

// Define props interface
interface AssetGridProps {
  assets: Asset[] | null | undefined;
  loading: boolean;
  error: string | null;
}

const CARD_WIDTH = 180; // Includes spacing
const CARD_HEIGHT = 240; // Includes spacing

const AssetGrid: React.FC<AssetGridProps> = ({ assets, loading, error }) => {
  const selectedIds = useSelection();
  const { toggleSelected, setSelected } = useAppActions();
  const { call: addToGroup } = useAddToGroup(); // Initialize the hook

  const handleAssetClick = useCallback(
    (assetId: number, event: React.MouseEvent) => {
      if (event.ctrlKey || event.metaKey) {
        toggleSelected(assetId);
      } else {
        setSelected([assetId]);
        // TODO: Handle single click for opening Preview Modal
        console.log(`Single click on asset ${assetId}`);
      }
    },
    [toggleSelected, setSelected],
  );

  // Define the grouping handler
  const handleGroupAssets = useCallback(async (sourceId: number, targetId: number) => {
    console.log(`AssetGrid handleGroupAssets: Source ${sourceId}, Target ${targetId}`);
    try {
      const result = await addToGroup({ sourceId, targetId });
      if (result.success) {
        console.log(`Successfully grouped asset ${sourceId} under ${targetId}`);
        // TODO: Optionally trigger a refresh of assets here if needed
        // refreshAssets(); // Assuming a function exists
      } else {
        console.error('Failed to group assets:', result.error);
        // TODO: Show error to user (e.g., toast notification)
      }
    } catch (err) {
      console.error('Error calling addToGroup:', err);
      // TODO: Show error to user
    }
  }, [addToGroup]); // Add addToGroup to dependency array

  // --- Grid Cell Renderer ---
  const Cell = useCallback(
    ({ columnIndex, rowIndex, style, data }: {
      columnIndex: number;
      rowIndex: number;
      style: CSSProperties;
      data: GridItemData & { handleGroupAssets: typeof handleGroupAssets }; // Add handler to itemData type
    }) => {
      const { items, columnCount, handleGroupAssets: onGroupHandler } = data; // Extract handler
      const index = rowIndex * columnCount + columnIndex;

      if (index >= items.length) {
        return null; // Render nothing if index is out of bounds
      }

      const asset = items[index];
      if (!asset) {
        return null; // Should not happen, but good practice
      }

      return (
        <Box
          style={style}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: theme => theme.spacing(1),
          }}
        >
          <AssetCard
            asset={asset}
            isSelected={selectedIds.has(asset.id)}
            onClick={event => handleAssetClick(asset.id, event)}
            // Pass the grouping handler down
            onGroup={onGroupHandler} 
          />
        </Box>
      );
    },
    [selectedIds, handleAssetClick], // Keep existing dependencies, handleGroupAssets is passed via itemData
  );

  // --- Loading State ---
  if (loading) {
    return (
      <Box sx={{ flexGrow: 1, p: 2, height: '100%', display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {Array.from({ length: 8 }).map((_, index) => (
          <Box key={`skeleton-${index}`} sx={{ width: CARD_WIDTH - 16, height: CARD_HEIGHT - 16 }}>
            <Skeleton variant="rectangular" height={140} sx={{ mb: 1 }} />
            <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
            <Skeleton variant="text" sx={{ fontSize: '0.8rem' }} />
          </Box>
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

  // --- Virtualized Grid ---
  return (
    <Box sx={{ flexGrow: 1, height: '100%', width: '100%', overflow: 'hidden' }}>
      <AutoSizer>
        {({ height, width }) => {
          const columnCount = Math.max(1, Math.floor(width / CARD_WIDTH));
          const rowCount = Math.ceil(assets.length / columnCount);

          return (
            <FixedSizeGrid
              columnCount={columnCount}
              columnWidth={CARD_WIDTH}
              height={height}
              rowCount={rowCount}
              rowHeight={CARD_HEIGHT}
              width={width}
              // Pass handleGroupAssets down via itemData
              itemData={{ items: assets, columnCount, handleGroupAssets }}
              style={{ overflowX: 'hidden' }}
            >
              {Cell}
            </FixedSizeGrid>
          );
        }}
      </AutoSizer>
    </Box>
  );
};

export default AssetGrid; 