import { createTheme } from '@mui/material/styles';

// Define a basic theme configuration
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      dark: '#115293',
    },
    secondary: {
      main: '#dc004e',
      dark: '#9a0036',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.125rem' }, // 34px
    h2: { fontSize: '1.75rem' },  // 28px
    h3: { fontSize: '1.5rem' },   // 24px
    h4: { fontSize: '1.25rem' },  // 20px
    body1: { fontSize: '1rem' },   // 16px
    caption: { fontSize: '0.875rem' }, // 14px
  },
  spacing: 8, // Base spacing unit
});

export default theme; 