import React, { useCallback } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer'; // Corrected import if needed, or assume types installed
import { Box } from '@mui/material';
import AssetCard from '../molecules/AssetCard';
import { Asset } from '../../types/api';
// import { useAddToGroup } from '../../hooks/useApi'; // Import the hook - TEMPORARILY COMMENTED OUT

// Placeholder hook until Step 5 is done
const useAddToGroup = () => ({
    call: async (payload: { sourceId: number; targetId: number }) => {
        console.warn('Placeholder useAddToGroup called:', payload);
        // Simulate API call structure
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
        // Simulate success or failure randomly for testing UI states
        const success = Math.random() > 0.2; // 80% success rate
        return { success: success, error: success ? undefined : 'Simulated API Error' };
    }
});

interface AssetGridProps {
  assets: Asset[];
  // Add selection handling later
}

// Define approximate dimensions for cards and gaps
const CARD_WIDTH = 180;
const CARD_HEIGHT = 220;
const GAP = 16; // Corresponds to theme.spacing(2)

const AssetGrid: React.FC<AssetGridProps> = ({ assets }) => {
  const { call: callAddToGroup } = useAddToGroup();

  const handleDropOnCard = useCallback(async (sourceId: number, targetId: number) => {
    console.log(`AssetGrid: Calling addToGroup with Source ${sourceId}, Target ${targetId}`);
    const result = await callAddToGroup({ sourceId, targetId });
    if (result.success) {
        console.log('Successfully grouped assets.');
        // TODO: Optionally trigger a refresh of the asset list here
        // e.g., by calling the fetchAssets function again
    } else {
        console.error('Failed to group assets:', result.error);
        // TODO: Show error to user (e.g., toast notification)
    }
  }, [callAddToGroup]);

  return (
    <Box sx={{ flexGrow: 1, height: '100%', width: '100%' }}>
      <AutoSizer>{
        ({ height, width }: { height: number; width: number }) => { // Added explicit types
          // Calculate how many columns fit in the available width
          const columnCount = Math.max(1, Math.floor((width - GAP) / (CARD_WIDTH + GAP)));
          const rowCount = Math.ceil(assets.length / columnCount);

          // Calculate the actual card width to fill the space
          const effectiveCardWidth = Math.floor((width - (columnCount + 1) * GAP) / columnCount);

          // Data to pass to each cell, including the calculated column count
          const itemData = { assets, columnCount, effectiveCardWidth, onDrop: handleDropOnCard };

          return (
            <Grid
              className="asset-grid" // Optional: for styling
              columnCount={columnCount}
              rowCount={rowCount}
              columnWidth={effectiveCardWidth + GAP}
              rowHeight={CARD_HEIGHT + GAP}
              width={width}
              height={height}
              itemData={itemData} // Pass data to Cell
              // style={{ overflowX: 'hidden' }} // Prevent horizontal scrollbar flicker
            >
              {/* Inline cell rendering function (uses columnIndex, rowIndex, style, data) */}
              {({ columnIndex, rowIndex, style, data }: {
                  columnIndex: number;
                  rowIndex: number;
                  style: React.CSSProperties;
                  data: { assets: Asset[]; columnCount: number; effectiveCardWidth: number; onDrop: (sourceId: number, targetId: number) => void };
              }) => {
                  const index = rowIndex * data.columnCount + columnIndex;
                  if (index >= data.assets.length) {
                    return null;
                  }
                  const asset = data.assets[index];
                  const cellStyle = {
                      ...style,
                      paddingLeft: GAP / 2,
                      paddingRight: GAP / 2,
                      paddingTop: GAP / 2,
                      paddingBottom: GAP / 2,
                      width: `${Number(style.width) - GAP}px`,
                      height: `${Number(style.height) - GAP}px`
                  };
                  return (
                      <Box style={cellStyle}>
                          <AssetCard
                              asset={asset}
                              style={{ width: '100%', height: '100%' }}
                              onDrop={data.onDrop}
                          />
                      </Box>
                  );
              }}
            </Grid>
          );
        }}
      </AutoSizer>
    </Box>
  );
};

export default AssetGrid; 