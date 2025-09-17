import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';

import App from './App';
import { AuthProvider } from './contexts/AuthContext';

// Suppress benign Chrome ResizeObserver dev error to avoid noisy overlay
if (typeof window !== 'undefined' && typeof window.ResizeObserver !== 'undefined') {
  const originalError = window.console.error;
  window.console.error = function (...args) {
    if (args && typeof args[0] === 'string' && args[0].includes('ResizeObserver loop completed with undelivered notifications')) {
      return; // ignore
    }
    originalError.apply(window.console, args);
  };
}

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Create Material-UI theme
const theme = createTheme({
  palette: {
    // Fresh, attractive palette: violet primary + amber secondary
    primary: {
      main: '#14B8A6',   // teal-500
      light: '#99F6E4',  // teal-200
      dark: '#0F766E',   // teal-700
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#FB7185',   // rose-400 (salmon)
      light: '#FDA4AF',  // rose-300
      dark: '#BE123C',   // rose-700
      contrastText: '#111827'
    },
    background: {
      default: '#F8FAFC',  // slate-50
      paper: '#FFFFFF'
    },
    text: {
      primary: '#0F172A',   // slate-900
      secondary: '#475569'  // slate-600
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700 }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
          paddingInline: 18,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: {
          background: 'linear-gradient(90deg, #14B8A6 0%, #FB7185 100%)'
        }
      }
    }
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <App />
            <ToastContainer
              position="top-right"
              autoClose={2000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);