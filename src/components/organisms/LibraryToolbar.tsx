import React, { useState, useCallback } from 'react';
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
  SelectChangeEvent,
  CircularProgress
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  useSortBy,
  useSelectionCount,
  useSelection,
  useAppActions
} from '../../store/filterStore';
import {
  useBulkImportAssets,
  useDeleteAsset
} from '../../hooks/useApi';

type SortableField = 'createdAt' | 'year' | 'advertiser' | 'niche' | 'shares';

const LibraryToolbar: React.FC = () => {
  const [view, setView] = useState('grid');
  const sortBy = useSortBy();
  const selectedIds = useSelection();
  const selectionCount = useSelectionCount();
  const { setSortBy, clearSelection } = useAppActions();
  const { call: callBulkImport, loading: importing } = useBulkImportAssets();
  const { call: callDeleteAsset, loading: deleting } = useDeleteAsset();

  const handleViewChange = useCallback((_event: React.MouseEvent<HTMLElement>, newView: string | null) => {
    if (newView !== null) {
      setView(newView);
    }
  }, []);

  const handleSortChange = useCallback((event: SelectChangeEvent<string>) => {
    setSortBy(event.target.value as SortableField);
  }, [setSortBy]);

  const handleBulkImportClick = useCallback(async () => {
    await callBulkImport();
  }, [callBulkImport]);

  const handleDeleteClick = useCallback(async () => {
    if (selectionCount === 0) return;
    
    const idsToDelete = Array.from(selectedIds);
    console.log('Attempting to delete assets:', idsToDelete);

    const results = await Promise.all(
        idsToDelete.map(id => callDeleteAsset({ id }))
    );

    const successes = results.filter(r => r.success).length;
    const failures = results.length - successes;
    console.log(`Deleted ${successes} assets, ${failures} failures.`);
    
    clearSelection(); 
  }, [selectedIds, selectionCount, callDeleteAsset, clearSelection]);

  const actionsDisabled = selectionCount === 0;
  const deleteInProgress = deleting;

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 31 }}>
        {selectionCount > 0 && (
          <>
            <Typography variant="body2" sx={{ mr: 1 }}>
              {selectionCount} selected
            </Typography>
            <Button 
              variant="outlined" 
              size="small" 
              startIcon={<EditIcon />} 
              disabled={actionsDisabled}
            >
              Edit Tags
            </Button>
            <Button 
              variant="outlined" 
              size="small" 
              color="error" 
              startIcon={deleteInProgress ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />} 
              disabled={actionsDisabled || deleteInProgress}
              onClick={handleDeleteClick}
            >
              {deleteInProgress ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        )}
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      <Button 
        variant="outlined" 
        size="small" 
        startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
        disabled={importing}
        onClick={handleBulkImportClick}
      >
        {importing ? 'Importing...' : 'Bulk Import'}
      </Button>

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel id="sort-select-label">Sort By</InputLabel>
        <Select
          labelId="sort-select-label"
          id="sort-select"
          value={sortBy}
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