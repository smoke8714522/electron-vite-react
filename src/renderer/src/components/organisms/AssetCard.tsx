import React, { useState } from 'react'
import { Card, CardMedia, CardContent, Typography, Checkbox, Box, Chip } from '@mui/material'
import { Asset } from '@/types/api'
import PlaceholderImage from '@renderer/assets/placeholder.png'
import VersionPanel from '../../../../components/organisms/VersionPanel'

interface AssetCardProps {
  asset: Asset & { versionCount?: number } // Add versionCount from potential aggregation
  isSelected: boolean
  onSelect: (assetId: number) => void
  onDeselect: (assetId: number) => void
  onClick: (assetId: number) => void // For opening the detail/edit view
  onDataChange?: () => void // Optional callback for data refresh
}

export function AssetCard({ asset, isSelected, onSelect, onDeselect, onClick, onDataChange }: AssetCardProps) {
  const [isVersionPanelOpen, setIsVersionPanelOpen] = useState(false)
  const thumbnailUrl = window.api.getThumbnailUrl(asset.id)

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelect(asset.id)
    } else {
      onDeselect(asset.id)
    }
  }

  const handleClick = () => {
    onClick(asset.id)
  }

  const handleToggleVersionPanel = (event: React.MouseEvent) => {
    event.stopPropagation()
    setIsVersionPanelOpen((prev) => !prev)
  }

  const handleVersionsChange = () => {
    console.log(`Versions changed for asset ${asset.id}, requesting data refresh.`)
    if (onDataChange) {
      onDataChange()
    }
  }

  return (
    <>
      <Card
        sx={{
          position: 'relative', // Needed for absolute positioning of checkbox and badge
        }}
      >
        <Box onClick={handleClick} sx={{ cursor: 'pointer' }}>
          {/* Thumbnail */}
          <Box sx={{ height: 140, overflow: 'hidden', position: 'relative', bgcolor: 'grey.200' }}>
            <CardMedia
              component="img"
              image={thumbnailUrl} // Use fetched URL
              alt={asset.fileName}
              sx={{
                objectFit: 'cover', // Changed from 'contain'
                width: '100%', // Ensure it fills width
                height: 140, // Fixed height
                display: 'block', // Added to prevent extra space if needed
              }}
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                // If thumbnail fails to load, show placeholder
                const target = e.target as HTMLImageElement
                target.src = PlaceholderImage // Use imported placeholder
                target.onerror = null // Prevent infinite loop if placeholder also fails
              }}
            />
            {/* Version Badge */}
            {asset.versionCount && asset.versionCount > 1 && (
              <Chip
                label={`${asset.versionCount} Versions`}
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  bgcolor: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.8)' }
                }}
                onClick={handleToggleVersionPanel}
              />
            )}
          </Box>

          {/* Metadata */}
          <CardContent sx={{ pt: 1, pb: '8px !important' }}> {/* Reduced padding */}
            <Typography variant="body2" noWrap title={asset.fileName}>
              {asset.fileName} {/* Display filename */}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {asset.advertiser || 'No Advertiser'} | {asset.year || 'N/A'}
            </Typography>
          </CardContent>
        </Box>

        {/* Selection Checkbox (Top-Left) - Outside main clickable area */}
        <Checkbox
          checked={isSelected}
          onChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()} // Prevent card click when clicking checkbox
          sx={{ position: 'absolute', top: 0, left: 0, zIndex: 1, color: 'white', '&.Mui-checked': { color: 'primary.main' } }}
        />

        {/* Render VersionPanel below CardContent if open */}
        {asset.id && ( // Ensure asset.id is valid before rendering panel
          <VersionPanel
            masterAssetId={asset.id}
            open={isVersionPanelOpen}
            onVersionsChange={handleVersionsChange}
          />
        )}
      </Card>
    </>
  )
} 