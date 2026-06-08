import { AppBar, Toolbar, IconButton, Box, Badge, Avatar, Menu, MenuItem, Typography, Divider, Tooltip } from '@mui/material';
import { NotificationsOutlined, DarkModeOutlined, LightModeOutlined, LogoutOutlined, PersonOutlined, SettingsOutlined } from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { toggleTheme } from '../../app/uiSlice';
import { logout } from '../../features/auth/authSlice';
import api from '../../lib/axios';
import { useUnreadCount } from '../../features/notifications/hooks/useNotifications';
import { NotificationPopover } from '../notifications/NotificationPopover';

export const Topbar = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useAppSelector((s) => s.ui.theme);
  const user = useAppSelector((s) => s.auth.user);
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);

  const { data: unreadCount = 0 } = useUnreadCount();

  const handleLogout = async () => {
    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken });
    } catch {}
    dispatch(logout());
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (t) => t.zIndex.drawer + 1,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ minHeight: '64px !important' }}>
        <Box sx={{ flex: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton size="small" onClick={() => dispatch(toggleTheme())}>
              {theme === 'light' ? <DarkModeOutlined fontSize="small" /> : <LightModeOutlined fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton size="small" onClick={(e) => setNotifAnchor(e.currentTarget)}>
              <Badge badgeContent={unreadCount || 0} color="error" max={99}>
                <NotificationsOutlined fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Account">
            <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 0.5 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13 }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Notification Popover */}
        <NotificationPopover
          anchorEl={notifAnchor}
          onClose={() => setNotifAnchor(null)}
        />

        {/* Account Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{ sx: { mt: 1, minWidth: 200 } }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="body2" fontWeight={600}>{user?.firstName} {user?.lastName}</Typography>
            <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { navigate('/settings/profile'); setAnchorEl(null); }}>
            <PersonOutlined fontSize="small" sx={{ mr: 1.5 }} /> Profile
          </MenuItem>
          <MenuItem onClick={() => { navigate('/settings'); setAnchorEl(null); }}>
            <SettingsOutlined fontSize="small" sx={{ mr: 1.5 }} /> Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <LogoutOutlined fontSize="small" sx={{ mr: 1.5 }} /> Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};
