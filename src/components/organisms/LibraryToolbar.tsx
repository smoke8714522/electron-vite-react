import React, { useCallback } from 'react';
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
  useDeleteAsset,
} from '../../hooks/useApi';
import type { ApiResponse, Asset } from '../../types/api';
import type { ViewMode } from '../../pages/LibraryView';

type SortableField = 'createdAt' | 'year' | 'advertiser' | 'niche' | 'shares';

interface LibraryToolbarProps {
  view: ViewMode;
  onViewChange: (newView: ViewMode) => void;
  onRefreshNeeded: () => Promise<ApiResponse<Asset[] | undefined>>;
}

const LibraryToolbar: React.FC<LibraryToolbarProps> = ({ 
  view, 
  onViewChange, 
  onRefreshNeeded 
}) => {
  const sortBy = useSortBy();
  const selectedIds = useSelection();
  const selectionCount = useSelectionCount();
  const { setSortBy, clearSelection } = useAppActions();
  const { call: callBulkImport, loading: importing } = useBulkImportAssets();
  const { call: callDeleteAsset, loading: deleting } = useDeleteAsset();

  const handleViewChange = useCallback((_event: React.MouseEvent<HTMLElement>, newView: string | null) => {
    if (newView !== null) {
      onViewChange(newView as ViewMode);
    }
  }, [onViewChange]);

  const handleSortChange = useCallback((event: SelectChangeEvent<string>) => {
    setSortBy(event.target.value as SortableField);
  }, [setSortBy]);

  const handleBulkImportClick = useCallback(async () => {
    const result = await callBulkImport();
    if (result && result.success) {
      console.log('Bulk import successful, triggering refresh...');
      await onRefreshNeeded();
    } else {
      console.error('Bulk import failed or returned unexpected result:', result);
    }
  }, [callBulkImport, onRefreshNeeded]);

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
    
    if (successes > 0) {
        console.log('Deletion successful, triggering refresh...');
        await onRefreshNeeded();
    }
  }, [selectedIds, selectionCount, callDeleteAsset, clearSelection, onRefreshNeeded]);

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
              onClick={() => console.log('Trigger Bulk Edit Modal')}
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