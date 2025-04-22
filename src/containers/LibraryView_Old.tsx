import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
  Paper
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SidebarFilters from '../components/organisms/SidebarFilters';
import AssetGrid from '../components/organisms/AssetGrid'; // Use the real component
import { useGetAssets, useBulkImportAssets } from '../hooks/useApi';
import { useFilters } from '../store/filterStore';
import { Asset } from '../types/api';

// Remove unused placeholder components
// const AssetGridPlaceholder: React.FC<{ assets: any[] }> = ({ assets }) => ( ... );
// const LibraryToolbarPlaceholder: React.FC = () => <Toolbar>Toolbar Placeholder</Toolbar>;

// Function to generate mock assets for testing
const generateMockAssets = (count: number): Asset[] => {
  const mocks: Asset[] = [];
  for (let i = 1; i <= count; i++) {
    mocks.push({
      id: i,
      path: `mock/path/image-${i}.jpg`,
      createdAt: new Date(Date.now() - Math.random() * 1e10).toISOString(),
      mimeType: i % 5 === 0 ? 'video/mp4' : (i % 3 === 0 ? 'application/pdf' : 'image/jpeg'),
      size: Math.floor(Math.random() * 10e6) + 1e5,
      year: 2020 + Math.floor(Math.random() * 4),
      advertiser: ['Nike', 'Adidas', 'Coca-Cola', 'Pepsi', 'Apple'][i % 5],
      niche: ['Sports', 'Beverages', 'Technology', 'Fashion', 'Food'][i % 5],
      shares: Math.floor(Math.random() * 50000),
      master_id: null,
      version_no: 1,
      fileName: `image-${i}.jpg`,
      thumbnailPath: `data:image/svg+xml;base64,...` // Use placeholder logic if needed
    });
  }
  return mocks;
};

const LibraryView: React.FC = () => {
  // API Hooks
  const { call: fetchAssets, loading: loadingAssets, error: errorAssets, data: apiAssetsData } = useGetAssets();
  const { call: callBulkImport, loading: importing, error: importError } = useBulkImportAssets();

  // State
  const filters = useFilters();
  const [isMockData, setIsMockData] = useState(false);
  const [displayedAssets, setDisplayedAssets] = useState<Asset[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  // Effect for fetching/filtering data when filters or mode change
  useEffect(() => {
    const fetchDataOrFilter = async () => {
        console.log('Filters/mode changed, fetching/filtering assets:', filters, isMockData);
        if (!isMockData) {
            // Fetch from API using current filters
            await fetchAssets(filters);
        } else {
            // Generate and filter mock data client-side
            const mockAssets = generateMockAssets(10000);
            const filtered = mockAssets.filter(asset => {
                let keep = true;
                if (filters.year && asset.year !== filters.year) keep = false;
                if (filters.advertiser && !asset.advertiser?.toLowerCase().includes(filters.advertiser.toLowerCase())) keep = false;
                if (filters.niche && !asset.niche?.toLowerCase().includes(filters.niche.toLowerCase())) keep = false;
                if (filters.searchTerm) {
                    const term = filters.searchTerm.toLowerCase();
                    const inAdvertiser = asset.advertiser?.toLowerCase().includes(term);
                    const inNiche = asset.niche?.toLowerCase().includes(term);
                    if (!inAdvertiser && !inNiche) keep = false;
                }
                if (asset.shares < filters.sharesRange[0] || asset.shares > filters.sharesRange[1]) keep = false;
                if (asset.master_id !== null) keep = false;
                return keep;
            });
            setDisplayedAssets(filtered);
        }
    };
    fetchDataOrFilter();
  }, [filters, isMockData, fetchAssets]);

  // Effect to update displayed assets when API data arrives
  useEffect(() => {
    if (!isMockData && apiAssetsData) {
      console.log('API data received, updating display');
      setDisplayedAssets(apiAssetsData);
    }
  }, [apiAssetsData, isMockData]);

  // Handlers
  const handleBulkImport = useCallback(async () => {
    const result = await callBulkImport();
    if (result.success && result.data) {
      setSnackbarMessage(`Imported ${result.data.importedCount} assets.` + (result.data.errors.length ? ` (${result.data.errors.length} errors)` : ''));
      setSnackbarSeverity(result.data.errors.length ? 'warning' : 'success');
      if (!isMockData) {
        fetchAssets(filters);
      }
    } else {
      setSnackbarMessage(`Import failed: ${importError || result.error || 'Unknown error'}`);
      setSnackbarSeverity('error');
    }
    setSnackbarOpen(true);
  }, [callBulkImport, isMockData, fetchAssets, filters, importError]);

  const handleCloseSnackbar = useCallback((_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  }, []);

  const handleUseMockData = useCallback(() => {
    console.log('Switching to Mock Data');
    setIsMockData(true);
  }, []);

  const handleUseApiData = useCallback(() => {
    console.log('Switching to API Data');
    setIsMockData(false);
  }, []);

  return (
    <Grid container spacing={0} sx={{ height: 'calc(100vh - 64px)' }}> {/* Adjust height based on header/app bar */}
      {/* Sidebar */}
      <Grid item xs={12} sm={3} md={2.5} lg={2} sx={{ height: '100%' }}>
        <SidebarFilters />
      </Grid>

      {/* Main Content Area */}
      <Grid item xs={12} sm={9} md={9.5} lg={10} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
         {/* Toolbar Area */}
         <Paper square elevation={1} sx={{ p: 1, mb: 0, borderBottom: 1, borderColor: 'divider' }}>
           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             {/* Left side of Toolbar - Item Count */}
             <Typography variant="body2">
               {loadingAssets && !isMockData ? 'Loading...' : `${displayedAssets.length} items`}
             </Typography>
             
             {/* Right side of Toolbar - Actions */}
             <Box sx={{ display: 'flex', gap: 1 }}>
               {/* Bulk Import Button */}
               <Button
                 variant="outlined" // Or contained
                 size="small"
                 startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
                 onClick={handleBulkImport}
                 disabled={importing || (loadingAssets && !isMockData)}
               >
                 {importing ? 'Importing...' : 'Bulk Import'}
               </Button>

               {/* Mock/API Data Toggle Buttons */}
               <Button size="small" onClick={handleUseMockData} disabled={isMockData}>Use 10k Mock Data</Button>
               <Button size="small" onClick={handleUseApiData} disabled={!isMockData}>Use API Data</Button>
             </Box>
            </Box>
         </Paper>

        {/* Asset Grid/List Area */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}> {/* Ensure this box grows and controls overflow */}
          {loadingAssets && !isMockData && <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />}
          {errorAssets && !isMockData && <Alert severity="error" sx={{ m: 2 }}>{errorAssets}</Alert>}
          {/* Render grid only when not loading/error OR when using mock data */}
          {(!loadingAssets || isMockData) && !errorAssets && (
             <AssetGrid assets={displayedAssets} />
          )}
           {/* Handle Empty State */}
           {(!loadingAssets || isMockData) && !errorAssets && displayedAssets.length === 0 && (
               <Box sx={{ textAlign: 'center', p: 4}}>
                   <Typography variant="h6">No assets found.</Typography>
                   <Typography>Try adjusting filters or use the Bulk Import button.</Typography>
               </Box>
           )}
        </Box>
      </Grid>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} variant="filled" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Grid>
  );
};

export default LibraryView; 