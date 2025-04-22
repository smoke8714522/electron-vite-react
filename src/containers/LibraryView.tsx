import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  Toolbar, // Assuming a Toolbar exists based on appflow
  // Import other necessary MUI components (Grid, List, etc.)
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile'; // Import icon

// Import hooks and components
import { useGetAssets, useBulkImportAssets } from '../hooks/useApi';
// import AssetGrid from '../components/organisms/AssetGrid';
// import AssetList from '../components/organisms/AssetList';
// import LibraryToolbar from '../components/organisms/LibraryToolbar'; // Example toolbar

// Placeholder for AssetGrid/List components
const AssetGridPlaceholder: React.FC<{ assets: any[] }> = ({ assets }) => (
  <Box p={2}>Grid View: {assets?.length ?? 0} assets</Box> // Added null check for safety
);

// Placeholder for Toolbar
const LibraryToolbarPlaceholder: React.FC = () => <Toolbar>Toolbar Placeholder</Toolbar>;

const LibraryView: React.FC = () => {
  const { 
    data: assets,
    loading: loadingAssets,
    error: errorAssets,
    call: fetchAssets
  } = useGetAssets();
  
  const {
    loading: importing,
    error: importError,
    // data: importResult, // Data is used in handler, no need to destructure here unless needed elsewhere
    call: bulkImport
  } = useBulkImportAssets();

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  // Fetch assets on mount
  useEffect(() => {
    fetchAssets(undefined);
  }, [fetchAssets]);

  const handleBulkImport = async () => {
    const result = await bulkImport(); // Call without args
    if (result.success && result.data) {
      let message = `Successfully imported ${result.data.importedCount} asset(s).`;
      if (result.data.errors.length > 0) {
        message += ` ${result.data.errors.length} failed. Check console for details.`;
        console.error('Import errors:', result.data.errors);
      }
      setSnackbarMessage(message);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      fetchAssets(undefined); // Refresh the asset list
    } else {
      setSnackbarMessage(`Import failed: ${result.error || 'Unknown error'}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  // Optional: Listen for 'assets-updated' event from main process
  // useEffect(() => {
  //   const listener = () => {
  //     console.log('Assets updated event received via IPC, refreshing...');
  //     fetchAssets(undefined);
  //   };
    // Requires setting up ipcRenderer listener in preload
    // E.g., contextBridge.exposeInMainWorld('electron', { onAssetsUpdated: (cb) => ipcRenderer.on('assets-updated', cb) }); 
    // window.electron.onAssetsUpdated(listener);
    // return () => { /* remove listener */ };
  // }, [fetchAssets]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' /* Example height */ }}>
      {/* Assuming a Toolbar component exists */} 
      <LibraryToolbarPlaceholder /> 

      {/* Button integrated into Toolbar or placed separately */} 
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Button
          variant="contained"
          startIcon={importing ? <CircularProgress size={20} color="inherit" /> : <UploadFileIcon />}
          onClick={handleBulkImport}
          disabled={importing || loadingAssets} // Also disable if loading assets initially
        >
          {importing ? 'Importing...' : 'Bulk Import'}
        </Button>
        {importError && (
            <Alert severity="error" sx={{ mt: 1 }}>Import Error: {importError}</Alert>
        )}
      </Box>

      {/* Main content area */} 
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {loadingAssets && <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />}
        {errorAssets && <Alert severity="error">Error loading assets: {errorAssets}</Alert>}
        {!loadingAssets && !errorAssets && assets && (
          // Replace with actual AssetGrid/AssetList components
          <AssetGridPlaceholder assets={assets} />
        )}
         {/* Handle case where assets array is empty */}
         {!loadingAssets && !errorAssets && assets && assets.length === 0 && (
            <Typography sx={{ p: 2, textAlign: 'center' }}>Library is empty. Click Bulk Import to add assets.</Typography>
         )}
         {/* Handle case where assets is null/undefined after loading */}
         {!loadingAssets && !errorAssets && !assets && (
            <Typography sx={{ p: 2, textAlign: 'center' }}>Could not load assets.</Typography>
         )}
      </Box>

      {/* Snackbar for import feedback */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LibraryView; 