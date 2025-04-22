import React from 'react';
import { Card, CardMedia, CardContent, Typography } from '@mui/material';
import { Asset } from '../../types/api'; // Assuming Asset type definition exists

// Function to generate placeholder SVG
const getPlaceholderSvg = (assetId: number, mimeType: string): string => {
    const colors = ['#1976d2', '#dc004e', '#388e3c', '#f57c00', '#673ab7'];
    const color = colors[assetId % colors.length];
    const svg = 
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="150" height="150">` +
      `<rect width="100" height="100" fill="${color}" />` +
      `<text x="50" y="55" font-family="sans-serif" font-size="12" fill="white" text-anchor="middle">${assetId}</text>` +
      `<text x="50" y="70" font-family="sans-serif" font-size="8" fill="white" text-anchor="middle">${mimeType.split('/')[0]}</text>` +
      `</svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Function to get the correct thumbnail URL (app-thumb:// or placeholder)
const getThumbnailUrl = (asset: Asset): string => {
    // Check if thumbnailPath exists and is a non-empty string
    if (asset.thumbnailPath && typeof asset.thumbnailPath === 'string') {
        // Extract the filename (e.g., "123.jpg") from the absolute path
        // Handle both Windows (\) and Linux/macOS (/) separators
        const parts = asset.thumbnailPath.replace(/\\/g, '/').split('/');
        const filename = parts[parts.length - 1];
        if (filename) {
            // Use the custom protocol
            return `app-thumb://${filename}`;
        }
    }
    // Fallback to placeholder SVG
    return getPlaceholderSvg(asset.id, asset.mimeType);
};

interface AssetCardProps {
  asset: Asset;
  style: React.CSSProperties; // For react-window positioning
  // Add handlers for drag/drop later
  onDrop?: (sourceId: number, targetId: number) => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, style, onDrop }) => {
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('application/json', JSON.stringify({ type: 'asset', id: asset.id }));
    event.dataTransfer.effectAllowed = 'move';
    // console.log('Drag Start:', asset.id);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Necessary to allow dropping
    event.dataTransfer.dropEffect = 'move';
    // Optionally add visual feedback here (e.g., border)
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    // Optionally remove visual feedback
    try {
      const data = JSON.parse(event.dataTransfer.getData('application/json'));
      if (data.type === 'asset' && typeof data.id === 'number' && data.id !== asset.id) {
        console.log(`Drop: Source ${data.id} onto Target ${asset.id}`);
        onDrop?.(data.id, asset.id);
      }
    } catch (e) {
      console.error('Error parsing dropped data:', e);
    }
  };

  // Use the correct function to get the image source URL
  const imageSrc = getThumbnailUrl(asset);
  // console.log(`Asset ${asset.id} - Thumbnail Path: ${asset.thumbnailPath} -> Image Source: ${imageSrc}`);

  return (
    <Card
      sx={{ ...style, display: 'flex', flexDirection: 'column', height: '100%' }} // Apply style for positioning
      draggable={true}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <CardMedia
        component="img"
        // Adjust height/objectFit as needed for your design
        sx={{ height: 140, objectFit: 'contain', p: 1, imageRendering: imageSrc.startsWith('data:image/svg') ? 'pixelated' : undefined }} // contain keeps aspect ratio
        image={imageSrc} // Use the determined source
        alt={`Thumbnail for ${asset.path}`}
        loading="lazy" // Basic lazy loading
        // Optional: Add onError handler for debugging
        onError={(e) => console.error(`Failed to load image: ${imageSrc}`, e)}
      />
      <CardContent sx={{ flexGrow: 1, p: 1, pt: 0 }}>
        <Typography variant="caption" display="block" noWrap gutterBottom>
          {/* Display filename or relevant short identifier */} 
          {asset.path.split('/').pop() || asset.path}
        </Typography>
        {/* Add more metadata previews if needed */}
        <Typography variant="body2" color="text.secondary">
            {asset.advertiser || '-'} / {asset.niche || '-'} ({asset.year || 'N/A'})
        </Typography>
         <Typography variant="caption" color="text.secondary">
            Shares: {asset.shares ?? 0}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default AssetCard; 