import React, { useCallback } from 'react';
import {
  Box,
  Drawer,
  Typography,
  TextField,
  Slider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import LabelIcon from '@mui/icons-material/Label';
import ShareIcon from '@mui/icons-material/Share';
import {
  useYearFilter,
  useAdvertiserFilter,
  useNicheFilter,
  useSharesRangeFilter,
  useSearchTermFilter,
  useAppActions
} from '../../store/filterStore';
import FilterField from '../atoms/FilterField';

const drawerWidth = 240;

// No props needed for static layout yet
// interface FilterSidebarProps {}

const FilterSidebar = () => {
  const year = useYearFilter();
  const advertiser = useAdvertiserFilter();
  const niche = useNicheFilter();
  const sharesRange = useSharesRangeFilter();
  const searchTerm = useSearchTermFilter();
  const { setYear, setAdvertiser, setNiche, setSharesRange, setSearchTerm } = useAppActions();

  const handleYearChange = useCallback((value: string | number) => {
    setYear(typeof value === 'number' ? value : undefined);
  }, [setYear]);

  const handleAdvertiserChange = useCallback((value: string | number) => {
    setAdvertiser(typeof value === 'string' ? value : '');
  }, [setAdvertiser]);

  const handleNicheChange = useCallback((value: string | number) => {
    setNiche(typeof value === 'string' ? value : '');
  }, [setNiche]);

  const handleSharesChange = useCallback((_event: Event, newValue: number | number[]) => {
    setSharesRange(newValue as [number, number]);
  }, [setSharesRange]);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, [setSearchTerm]);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
          position: 'relative',
          height: '100%',
        },
      }}
    >
      <Box sx={{ p: 2, overflowY: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>

        <List dense>
          <FilterField
            icon={<CalendarTodayIcon fontSize="small" />}
            label="Year"
            type="number"
            value={year ?? ''}
            onChange={handleYearChange}
          />
          <FilterField
            icon={<PersonIcon fontSize="small" />}
            label="Advertiser"
            value={advertiser ?? ''}
            onChange={handleAdvertiserChange}
          />
          <FilterField
            icon={<LabelIcon fontSize="small" />}
            label="Niche"
            value={niche ?? ''}
            onChange={handleNicheChange}
          />

          <ListItem disablePadding>
            <ListItemIcon sx={{minWidth: 32}}><ShareIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Shares" />
          </ListItem>
          <Slider
            value={sharesRange}
            onChange={handleSharesChange}
            aria-labelledby="shares-slider"
            valueLabelDisplay="auto"
            step={1000}
            marks
            min={0}
            max={100000}
            sx={{mb: 1.5, width: '95%', mx: 'auto'}}
          />

          <Divider sx={{ my: 1 }} />

          <ListItemText primary="Search Tags" />
          <TextField
            value={searchTerm ?? ''}
            onChange={handleSearchChange}
            size="small"
            variant="outlined"
            placeholder="Search..."
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </List>
      </Box>
    </Drawer>
  );
};

export default FilterSidebar; 