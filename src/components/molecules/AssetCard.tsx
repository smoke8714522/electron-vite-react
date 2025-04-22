import React from 'react';
import { Card, CardContent, CardMedia, Typography, Checkbox } from '@mui/material';
import { Asset } from '../../types/api';

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
  const thumbnailUrl = getThumbnailUrl(asset);
  const displayFilename = asset.path?.split(/[\\/]/).pop() || 'Unknown File';

  return (
    // Attach onClick handler, add border style for selection
    <Card 
      onClick={onClick} 
      sx={{ 
        position: 'relative', 
        cursor: 'pointer',
        border: isSelected ? '2px solid' : '2px solid transparent', // Highlight border
        borderColor: isSelected ? 'primary.main' : 'transparent',
        height: '100%', // Ensure card takes full grid item height
        display: 'flex', 
        flexDirection: 'column'
      }}
    >
      {/* Selection Checkbox Overlay */}
      {isSelected && (
         <Checkbox 
            checked={isSelected}
            size="small"
            sx={{ position: 'absolute', top: 0, left: 0, zIndex: 1, p: 0.5, backgroundColor: 'rgba(255,255,255,0.7)' }}
            // Prevent click on checkbox itself from propagating to card onClick
            onClick={(e) => e.stopPropagation()} 
            readOnly // Selection handled by card click
          />
      )}

      <CardMedia
        component="img"
        height="140"
        image={thumbnailUrl} // Use actual thumbnail path
        alt={`Thumbnail for ${displayFilename}`}
        sx={{ backgroundColor: 'grey.200', objectFit: 'contain' }}
        // Optional: Add onError handler for debugging
        onError={(e) => console.error(`Failed to load image: ${thumbnailUrl}`, e)}
      />
      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 }, flexGrow: 1 }}> {/* Added flexGrow */}
        {/* Display actual filename */}
        <Typography gutterBottom variant="body2" component="div" noWrap title={displayFilename}>
          {displayFilename}
        </Typography>
        {/* Display actual metadata */}
        <Typography variant="caption" color="text.secondary" noWrap>
          {asset.year || 'N/A'} | {asset.advertiser || '-'} | {asset.niche || '-'}
        </Typography>
        {/* Placeholder for Version Badge */}
        {/* <Box sx={{ position: 'absolute', bottom: 8, right: 8, zIndex: 1 }}>
          Version Badge 
        </Box> */}
      </CardContent>
    </Card>
  );
};

export default AssetCard;