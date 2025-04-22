import React from 'react';
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

const drawerWidth = 240;

// No props needed for static layout yet
// interface FilterSidebarProps {}

const FilterSidebar: React.FC = () => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
          position: 'relative', // Keep it in the flow of the flex container
          height: '100%',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>

        {/* Placeholder Filter Sections */}
        <List dense>
          <ListItem disablePadding>
            <ListItemIcon sx={{minWidth: 32}}><CalendarTodayIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Year" />
          </ListItem>
          <TextField size="small" variant="outlined" placeholder="e.g., 2023" fullWidth sx={{mb: 1.5}} />

          <ListItem disablePadding>
            <ListItemIcon sx={{minWidth: 32}}><PersonIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Advertiser" />
          </ListItem>
          <TextField size="small" variant="outlined" placeholder="e.g., Nike" fullWidth sx={{mb: 1.5}} />

          <ListItem disablePadding>
            <ListItemIcon sx={{minWidth: 32}}><LabelIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Niche" />
          </ListItem>
          <TextField size="small" variant="outlined" placeholder="e.g., Sports" fullWidth sx={{mb: 1.5}} />

          <ListItem disablePadding>
            <ListItemIcon sx={{minWidth: 32}}><ShareIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Shares" />
          </ListItem>
          <Slider
            defaultValue={0}
            aria-labelledby="shares-slider"
            valueLabelDisplay="auto"
            step={1000}
            marks
            min={0}
            max={100000} // Example max
            sx={{mb: 1.5}}
          />

          <Divider sx={{ my: 1 }} />

          <ListItemText primary="Search Tags" />
          <TextField
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