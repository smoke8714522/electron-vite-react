import React, { useRef } from 'react';
import { Card, CardContent, CardMedia, Typography, Checkbox } from '@mui/material';
import { Asset } from '../../types/api';
import { useDrag, useDrop } from 'react-dnd';
import { ItemTypes, DndItem } from '../../types/dnd';

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
  onGroup: (sourceId: number, targetId: number) => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, isSelected, onClick, onGroup }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.ASSET_CARD,
    item: { id: asset.id, type: ItemTypes.ASSET_CARD } as DndItem,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [asset.id]);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.ASSET_CARD,
    drop: (item: DndItem) => {
      if (item.id !== asset.id) {
        console.log(`AssetCard Drop: Source ${item.id} -> Target ${asset.id}`);
        onGroup(item.id, asset.id);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [asset.id, onGroup]);

  const thumbnailUrl = getThumbnailUrl(asset);
  const displayFilename = asset.path?.split(/[\\/]/).pop() || 'Unknown File';

  drag(drop(ref));

  return (
    <Card
      ref={ref}
      onClick={onClick}
      sx={{
        position: 'relative',
        border: isSelected ? '2px solid' : '2px solid transparent',
        borderColor: isSelected ? 'primary.main' : 'transparent',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        outline: isOver && canDrop ? `2px dashed ${'#1976d2'}` : 'none',
        outlineOffset: '2px',
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