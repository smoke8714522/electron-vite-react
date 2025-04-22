import React, { useState } from 'react';
import {
  CssBaseline,
  AppBar,
  Toolbar,
  Box,
  Tabs,
  Tab
} from '@mui/material';
import LibraryView from './pages/LibraryView';
import './App.css';

const APP_BAR_HEIGHT = 64;

function App() {
  const [currentView, setCurrentView] = useState('library');

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setCurrentView(newValue);
    console.log('Switching view to:', newValue);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          height: `${APP_BAR_HEIGHT}px`
        }}
      >
        <Toolbar>
          <Box sx={{ flexGrow: 1 }}>
            <Tabs
              value={currentView}
              onChange={handleTabChange}
              textColor="inherit"
              aria-label="main navigation tabs"
              sx={{ 
                '& .MuiTabs-indicator': {
                  backgroundColor: 'white',
                },
              }}
            >
              <Tab 
                label="Library" 
                value="library" 
                sx={{ '&:focus': { outline: 'none' } }}
              />
              <Tab 
                label="Settings" 
                value="settings" 
                sx={{ '&:focus': { outline: 'none' } }}
              />
            </Tabs>
          </Box>
        </Toolbar>
      </AppBar>
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          width: '100%', 
          mt: `${APP_BAR_HEIGHT}px`,
          height: `calc(100vh - ${APP_BAR_HEIGHT}px)`,
          display: 'flex'
        }}
      >
        {currentView === 'library' && <LibraryView />}
      </Box>
    </Box>
  );
}

export default App;