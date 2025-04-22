import React, { useState, useEffect } from 'react';
import {
  CssBaseline,
  Box,
} from '@mui/material';
import LibraryView from './pages/LibraryView';
import SettingsView from './pages/SettingsView';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState('library');

  useEffect(() => {
    if (window.api && typeof window.api.onViewChange === 'function') {
      console.log('Renderer: Setting up onViewChange listener...');
      const cleanup = window.api.onViewChange((viewName) => {
        console.log('Renderer: Received view change from main:', viewName);
        setActiveView(viewName);
      });
      
      return cleanup;
    } else {
      console.error('Renderer: window.api.onViewChange is not available!');
    }
  }, []);

  return (
    <Box sx={{ height: '100vh', display: 'flex' }}>
      <CssBaseline />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          display: 'flex',
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        {activeView === 'library' && <LibraryView />}
        {activeView === 'settings' && <SettingsView />}
      </Box>
    </Box>
  );
}

export default App;