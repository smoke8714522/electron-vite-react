import React, { useCallback, CSSProperties } from 'react';
import {
  Box,
  Alert,
  Typography,
  Skeleton
} from '@mui/material';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeGrid } from 'react-window';
import AssetCard from '../molecules/AssetCard';
import {
  useSelection,
} from '../../store/filterStore';
import type { Asset } from '../../types/api'; // Need Asset type for props
import { useAddToGroup } from '../../hooks/useApi'; // Import the hook

// Type for the itemData prop passed to FixedSizeGrid
interface GridItemData {
  items: (Asset & { versionCount?: number })[]; // Expect items to have versionCount
  columnCount: number;
  selectedIds: Set<number>;
  // Pass down handlers from props
  onAssetClick: (asset: Asset) => void;
  onGroupHandler: (sourceId: number, targetId: number) => void;
  onDataChange: () => void;
}

// Define props interface
interface AssetGridProps {
  assets: (Asset & { versionCount?: number })[] | null | undefined; // Expect assets with versionCount
  loading: boolean;
  error: string | null;
  // Add props from LibraryView
  onAssetClick: (asset: Asset) => void;
  onDataChange: () => void;
}

const CARD_WIDTH = 180; // Includes spacing
const CARD_HEIGHT = 240; // Includes spacing

const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  loading,
  error,
  onAssetClick, // Receive from props
  onDataChange // Receive from props
}) => {
  const selectedIds = useSelection();
  const { call: addToGroup } = useAddToGroup();

  // Grouping handler remains local
  const handleGroupAssets = useCallback(async (sourceId: number, targetId: number) => {
    console.log(`AssetGrid handleGroupAssets: Source ${sourceId}, Target ${targetId}`);
    try {
      const result = await addToGroup({ sourceId, targetId });
      if (result.success) {
        console.log(`Successfully grouped asset ${sourceId} under ${targetId}`);
        // Trigger general data refresh after grouping
        onDataChange();
      } else {
        console.error('Failed to group assets:', result.error);
        // TODO: Show error
      }
    } catch (err) {
      console.error('Error calling addToGroup:', err);
      // TODO: Show error
    }
  }, [addToGroup, onDataChange]); // Added onDataChange dependency

  // --- Grid Cell Renderer ---
  const Cell = useCallback(
    ({ columnIndex, rowIndex, style, data }: {
      columnIndex: number;
      rowIndex: number;
      style: CSSProperties;
      // Updated data type
      data: GridItemData;
    }) => {
      const { items, columnCount, selectedIds, onAssetClick, onGroupHandler, onDataChange } = data;
      const index = rowIndex * columnCount + columnIndex;

      if (index >= items.length) return null;
      const asset = items[index];
      if (!asset) return null;

      // Adjust style height if needed based on dynamic content (difficult with FixedSizeGrid)
      // For now, assume fixed size

      return (
        // Apply padding directly to the style passed by FixedSizeGrid
        <Box style={{...style, padding: '8px' }}>
          <AssetCard
            asset={asset} // Pass asset with versionCount
            isSelected={selectedIds.has(asset.id)}
            onClick={() => onAssetClick(asset)} // Pass down the handler from LibraryView
            onGroup={onGroupHandler}
            onDataChange={onDataChange} // Pass down the handler
          />
        </Box>
      );
    },
    [] // Dependencies managed by itemData - refs are stable if passed via itemData
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
          const rowCount = Math.ceil((assets?.length ?? 0) / columnCount);

          // Correctly construct itemData with ALL fields from GridItemData
          const itemData: GridItemData = {
              items: assets || [],
              columnCount,
              selectedIds,
              onAssetClick,
              onGroupHandler: handleGroupAssets,
              onDataChange
          };

          return (
            <FixedSizeGrid
              columnCount={columnCount}
              columnWidth={CARD_WIDTH}
              height={height}
              rowCount={rowCount}
              // Adjust row height dynamically? Hard with FixedSizeGrid.
              // Keep fixed for now, VersionPanel might overflow or be clipped.
              // Consider VariableSizeGrid or alternatives if needed.
              rowHeight={CARD_HEIGHT}
              width={width}
              itemData={itemData} // Pass the correctly constructed itemData
              style={{ overflowX: 'hidden' }} // Prevent horizontal scrollbar issues
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