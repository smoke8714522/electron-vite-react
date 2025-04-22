import React, { useCallback } from 'react';
import { Card, CardContent, CardMedia, Typography, Checkbox } from '@mui/material';
import { Asset } from '../../types/api';
import { useAddToGroup } from '../../hooks/useApi';

// Function to get thumbnail URL (copied from AssetCard_Old.tsx logic)
const getThumbnailUrl = (asset: Asset): string => {
  if (asset.thumbnailPath && typeof asset.thumbnailPath === 'string') {
    const parts = asset.thumbnailPath.replace(/\\/g, '/').split('/');
    const filename = parts[parts.length - 1];
    if (filename) {
      return `app-thumb://${filename}`;
    }
  }
  // Basic SVG placeholder if no path
  const colors = ['#1976d2', '#dc004e', '#388e3c', '#f57c00', '#673ab7'];
  const color = colors[asset.id % colors.length];
  const svg = 
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">` +
    `<rect width="100" height="100" fill="${color}" />` +
    `<text x="50" y="55" font-family="sans-serif" font-size="10" fill="white" text-anchor="middle">${asset.id}</text>` +
    `</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Updated props
interface AssetCardProps {
  asset: Asset;
  isSelected: boolean;
  onClick: (event: React.MouseEvent) => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, isSelected, onClick }) => {
  const { call: addToGroup, loading: isGrouping } = useAddToGroup();

  const handleDragStart = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('application/advault-asset-id', String(asset.id));
    event.dataTransfer.effectAllowed = 'move';
  }, [asset.id]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceIdStr = event.dataTransfer.getData('application/advault-asset-id');
    const targetId = asset.id;

    if (sourceIdStr && targetId) {
      const sourceId = parseInt(sourceIdStr, 10);
      if (sourceId !== targetId && !isNaN(sourceId)) {
        console.log(`Attempting to group asset ${sourceId} under ${targetId}`);
        try {
          const result = await addToGroup({ sourceId, targetId });
          if (result.success) {
            console.log(`Successfully grouped asset ${sourceId} under ${targetId}`);
          } else {
            console.error('Failed to group assets:', result.error);
          }
        } catch (error) {
          console.error('Error calling addToGroup:', error);
        }
      }
    }
  }, [asset.id, addToGroup]);

  const thumbnailUrl = getThumbnailUrl(asset);
  const displayFilename = asset.path?.split(/[\\/]/).pop() || 'Unknown File';

  return (
    <Card 
      onClick={onClick} 
      draggable={true}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      sx={{ 
        position: 'relative', 
        border: isSelected ? '2px solid' : '2px solid transparent',
        borderColor: isSelected ? 'primary.main' : 'transparent',
        height: '100%',
        display: 'flex', 
        flexDirection: 'column',
        opacity: isGrouping ? 0.5 : 1,
        cursor: 'grab',
      }}
    >
      {isSelected && (
         <Checkbox 
            checked={isSelected}
            size="small"
            sx={{ position: 'absolute', top: 0, left: 0, zIndex: 1, p: 0.5, backgroundColor: 'rgba(255,255,255,0.7)' }}
            onClick={(e) => e.stopPropagation()} 
            readOnly
          />
      )}

      <CardMedia
        component="img"
        height="140"
        image={thumbnailUrl}
        alt={`Thumbnail for ${displayFilename}`}
        sx={{
          backgroundColor: 'grey.200',
          objectFit: 'cover',
          objectPosition: 'top'
        }}
        onError={(e) => console.error(`Failed to load image: ${thumbnailUrl}`, e)}
        onDragStart={(e) => e.preventDefault()}
      />
      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 }, flexGrow: 1 }}>
        <Typography gutterBottom variant="body2" component="div" noWrap title={displayFilename}>
          {displayFilename}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {asset.year || 'N/A'} | {asset.advertiser || '-'} | {asset.niche || '-'}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default AssetCard;