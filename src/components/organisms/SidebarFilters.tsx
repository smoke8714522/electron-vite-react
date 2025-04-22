import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Slider,
  Paper,
  Divider,
  InputAdornment,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import {
  useYearFilter,
  useAdvertiserFilter,
  useNicheFilter,
  useSharesRangeFilter,
  useSearchTermFilter,
  useAppActions,
} from '../../store/filterStore';

const SidebarFilters: React.FC = () => {
  const year = useYearFilter();
  const advertiser = useAdvertiserFilter();
  const niche = useNicheFilter();
  const sharesRange = useSharesRangeFilter();
  const searchTerm = useSearchTermFilter();

  const { setYear, setAdvertiser, setNiche, setSharesRange, setSearchTerm } = useAppActions();

  const MAX_SHARES = 100000;

  const handleSharesChange = (_event: Event, newValue: number | number[]) => {
    setSharesRange(newValue as [number, number]);
  };

  const handleSearchClear = () => {
    setSearchTerm(undefined);
  };

  return (
    <Paper elevation={1} sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Filters
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Box component="form" noValidate autoComplete="off">
        <TextField
          label="Search Metadata"
          variant="outlined"
          fullWidth
          size="small"
          value={searchTerm || ''}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm ? (
              <InputAdornment position="end">
                <IconButton onClick={handleSearchClear} edge="end" size="small">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        <TextField
          label="Year"
          variant="outlined"
          type="number"
          fullWidth
          size="small"
          value={year || ''}
          onChange={(e) => setYear(e.target.value ? parseInt(e.target.value, 10) : undefined)}
          sx={{ mb: 2 }}
        />

        <TextField
          label="Advertiser"
          variant="outlined"
          fullWidth
          size="small"
          value={advertiser || ''}
          onChange={(e) => setAdvertiser(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          label="Niche"
          variant="outlined"
          fullWidth
          size="small"
          value={niche || ''}
          onChange={(e) => setNiche(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Typography gutterBottom>Shares</Typography>
        <Slider
          value={sharesRange}
          onChange={handleSharesChange}
          valueLabelDisplay="auto"
          min={0}
          max={MAX_SHARES}
          step={100}
          sx={{ mx: 1, width: 'calc(100% - 16px)' }}
        />
         <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, mb: 2 }}>
            <Typography variant="caption">{sharesRange[0]}</Typography>
            <Typography variant="caption">{sharesRange[1]}</Typography>
          </Box>

      </Box>
    </Paper>
  );
};

export default SidebarFilters; 