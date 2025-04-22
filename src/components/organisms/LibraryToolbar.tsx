import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit'; // For Edit Tags
import UploadFileIcon from '@mui/icons-material/UploadFile'; // For Bulk Import

// No props needed for static layout yet
// interface LibraryToolbarProps {}

const LibraryToolbar: React.FC = () => {
  const [view, setView] = useState('grid');
  const [sort, setSort] = useState('createdAt');
  const selectionCount = 2; // Placeholder

  const handleViewChange = (
    _event: React.MouseEvent<HTMLElement>,
    newView: string | null,
  ) => {
    if (newView !== null) {
      setView(newView);
    }
  };

  const handleSortChange = (event: SelectChangeEvent<string>) => {
    setSort(event.target.value as string);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      {/* Selection Actions (Keep on left for now) */}
      {selectionCount > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ mr: 1 }}>
            {selectionCount} selected
          </Typography>
          <Button variant="outlined" size="small" startIcon={<EditIcon />}>
            Edit Tags
          </Button>
          <Button variant="outlined" size="small" color="error" startIcon={<DeleteIcon />}>
            Delete
          </Button>
        </Box>
      )}

      {/* Spacer pushes everything after this to the right */}
      <Box sx={{ flexGrow: 1 }} />

      {/* Bulk Import Button - MOVED RIGHT */}
      <Button variant="outlined" size="small" startIcon={<UploadFileIcon />}>
        Bulk Import
      </Button>

      {/* Sort Dropdown - MOVED RIGHT */}
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel id="sort-select-label">Sort By</InputLabel>
        <Select
          labelId="sort-select-label"
          id="sort-select"
          value={sort}
          label="Sort By"
          onChange={handleSortChange}
        >
          <MenuItem value="createdAt">Date Created</MenuItem>
          <MenuItem value="year">Year</MenuItem>
          <MenuItem value="advertiser">Advertiser</MenuItem>
          <MenuItem value="niche">Niche</MenuItem>
          <MenuItem value="shares">Shares</MenuItem>
        </Select>
      </FormControl>

      {/* View Toggle - MOVED RIGHT */}
      <ToggleButtonGroup
        value={view}
        exclusive
        onChange={handleViewChange}
        aria-label="view mode"
        size="small"
      >
        <ToggleButton value="grid" aria-label="grid view">
          <ViewModuleIcon />
        </ToggleButton>
        <ToggleButton value="list" aria-label="list view">
          <ViewListIcon />
        </ToggleButton>
      </ToggleButtonGroup>

    </Box>
  );
};

export default LibraryToolbar; 