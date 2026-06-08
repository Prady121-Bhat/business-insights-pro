import { Box, Snackbar, Alert } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { Sidebar, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from './Sidebar';
import { Topbar } from './Topbar';
import { useAppSelector, useAppDispatch } from '../../hooks/useAppDispatch';
import { hideSnackbar } from '../../app/uiSlice';

export const AppLayout = () => {
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);
  const snackbar = useAppSelector((s) => s.ui.snackbar);
  const sidebarWidth = sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, ml: `${sidebarWidth}px`, transition: 'margin 0.2s ease' }}>
        <Topbar />
        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3 },
            mt: '64px',
            minHeight: 'calc(100vh - 64px)',
            maxWidth: '100%',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => dispatch(hideSnackbar())}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => dispatch(hideSnackbar())}
          sx={{ minWidth: 280 }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
