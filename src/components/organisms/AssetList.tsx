import React, { useCallback } from 'react';
import { Box, Alert, Typography, Skeleton, ListItem, ListItemAvatar, Avatar, ListItemText } from '@mui/material';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { useSelection, useAppActions } from '../../store/filterStore';
import type { Asset } from '../../types/api';

// Define props interface
interface AssetListProps {
  assets: Asset[] | null | undefined;
  loading: boolean;
  error: string | null;
}

// Type for the itemData prop passed to FixedSizeList
interface ListItemData {
  items: Asset[];
  selectedIds: Set<number>;
  handleAssetClick: (assetId: number, event: React.MouseEvent) => void;
  // Add other needed data like drag/drop handlers if necessary
}

const ITEM_HEIGHT = 72; // Standard MUI ListItem height with avatar

// --- List Row Renderer ---
const Row = React.memo(({ index, style, data }: ListChildComponentProps<ListItemData>) => {
  const { items, selectedIds, handleAssetClick } = data;
  const asset = items[index];

  if (!asset) {
    return null; // Should not happen if index is correct
  }

  const isSelected = selectedIds.has(asset.id);

  // TODO: Replace with actual thumbnail URL generation logic
  const thumbnailUrl = `/vault/cache/thumbnails/${asset.id}.jpg`; 

  return (
    <ListItem
      style={style} // Apply react-window style for positioning
      key={asset.id}
      component="div" // Important for react-window
      divider
      button // Make it interactive
      selected={isSelected}
      onClick={(event) => handleAssetClick(asset.id, event)}
      sx={{
        // Add hover effect, etc.
        '&:hover': {
          backgroundColor: 'action.hover',
        },
        // Potentially add drag-and-drop styling here
      }}
      // --- Drag and Drop Props (Assume ListItem or a wrapper handles these) ---
      // draggable={true} // Example
      // onDragStart={/*...*/} // Example
      // onDrop={/*...*/} // Example
      // onDragOver={/*...*/} // Example
    >
      <ListItemAvatar>
        {/* TODO: Handle thumbnail loading/error states */}
        <Avatar variant="rounded" src={thumbnailUrl} alt={asset.path} sx={{ width: 56, height: 56, mr: 1 }}/>
      </ListItemAvatar>
      <ListItemText 
        primary={asset.path.split('/').pop() || asset.path} // Show filename
        secondary={
          <Typography variant="caption" color="text.secondary" component="span">
            {`Year: ${asset.year || 'N/A'} | Adv: ${asset.advertiser || 'N/A'} | Niche: ${asset.niche || 'N/A'} | Shares: ${asset.shares}`}
          </Typography>
        }
      />
      {/* TODO: Add version badge if applicable */}
      {/* TODO: Add action icons (promote, remove, delete) for versions if this row represents a version */}
    </ListItem>
  );
});
Row.displayName = 'AssetListRow'; // Add display name for debugging

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
        console.log(`Single click on asset ${assetId}`);
      }
    },
    [toggleSelected, setSelected],
  );

  // --- Loading State ---
  if (loading) {
    return (
      <Box sx={{ flexGrow: 1, p: 2, height: '100%' }}>
        {Array.from({ length: 10 }).map((_, index) => (
          <ListItem key={`skeleton-${index}`} sx={{ height: ITEM_HEIGHT }}>
            <ListItemAvatar>
              <Skeleton variant="rectangular" width={56} height={56} sx={{ mr: 1 }} />
            </ListItemAvatar>
            <ListItemText
              primary={<Skeleton variant="text" width="60%" />}
              secondary={<Skeleton variant="text" width="80%" />}
            />
          </ListItem>
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

  // Data to pass to each Row component instance
  const itemData: ListItemData = {
    items: assets,
    selectedIds,
    handleAssetClick,
    // Pass other handlers if needed
  };

  // --- Virtualized List ---
  return (
    <Box sx={{ flexGrow: 1, height: '100%', width: '100%', overflow: 'hidden' }}>
      <AutoSizer>
        {({ height, width }) => (
          <FixedSizeList
            height={height}
            width={width}
            itemCount={assets.length}
            itemSize={ITEM_HEIGHT}
            itemData={itemData} // Pass data down to Row component
            overscanCount={5} // Render a few extra items above/below viewport
          >
            {Row}
          </FixedSizeList>
        )}
      </AutoSizer>
    </Box>
  );
};

export default AssetList; 