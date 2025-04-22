import React from 'react';
import { Card, CardContent, CardMedia, Typography, Box } from '@mui/material';

// Basic props for placeholder
interface AssetCardProps {
  id: string | number; // Or use the actual Asset type later
}

const AssetCard: React.FC<AssetCardProps> = ({ id }) => {
  return (
    <Card sx={{ position: 'relative' }}>
      {/* Placeholder for Selection Checkbox/Overlay */}
      <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '50%' }}>
        {/* Placeholder Icon */}
      </Box>

      <CardMedia
        component="img"
        height="140"
        image="/placeholder.svg" // Replace with actual thumbnail path later
        alt="Asset thumbnail"
        sx={{ backgroundColor: 'grey.200', objectFit: 'contain' }}
      />
      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
        {/* Placeholder for Title/Filename */}
        <Typography gutterBottom variant="body2" component="div" noWrap>
          Filename_{id}.jpg
        </Typography>
        {/* Placeholder for Metadata (e.g., Year, Advertiser) */}
        <Typography variant="caption" color="text.secondary" noWrap>
          Year, Advertiser, Niche
        </Typography>
        {/* Placeholder for Version Badge */}
        <Box sx={{ position: 'absolute', bottom: 8, right: 8, zIndex: 1 }}>
          {/* Placeholder Version count */}
        </Box>
      </CardContent>
    </Card>
  );
};

export default AssetCard;