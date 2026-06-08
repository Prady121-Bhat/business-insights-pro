import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider, Avatar, Chip, Tooltip, IconButton, alpha,
} from '@mui/material';
import {
  DashboardOutlined, TrendingUpOutlined, PeopleOutlined,
  InventoryOutlined, InsightsOutlined, AssessmentOutlined,
  UploadFileOutlined, NotificationsOutlined, SettingsOutlined,
  ChevronLeft, ChevronRight, BarChartOutlined, AccountBalanceWalletOutlined,
  AutoGraphOutlined,
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../../hooks/useAppDispatch';
import { toggleSidebar } from '../../app/uiSlice';

export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 64;

const NAV_ITEMS = [
  { label: 'Overview', icon: <DashboardOutlined />, path: '/dashboard' },
  { label: 'Revenue', icon: <TrendingUpOutlined />, path: '/analytics/revenue' },
  { label: 'Customers', icon: <PeopleOutlined />, path: '/analytics/customers' },
  { label: 'Inventory', icon: <InventoryOutlined />, path: '/analytics/inventory' },
  { label: 'Expenses', icon: <AccountBalanceWalletOutlined />, path: '/analytics/expenses' },
  { label: 'Forecasting', icon: <InsightsOutlined />, path: '/forecasting' },
  { divider: true },
  { label: 'Sales', icon: <BarChartOutlined />, path: '/sales' },
  { label: 'Products', icon: <InventoryOutlined />, path: '/products' },
  { label: 'Reports', icon: <AssessmentOutlined />, path: '/reports' },
  { label: 'Import Data', icon: <UploadFileOutlined />, path: '/imports' },
  { divider: true },
  { label: 'AI Insights', icon: <AutoGraphOutlined />, path: '/insights' },
  { label: 'Notifications', icon: <NotificationsOutlined />, path: '/notifications' },
  { label: 'Settings', icon: <SettingsOutlined />, path: '/settings' },
];

interface NavItemDef { label?: string; icon?: React.ReactNode; path?: string; divider?: boolean }

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.sidebarOpen);
  const user = useAppSelector((s) => s.auth.user);
  const company = useAppSelector((s) => s.auth.company);

  const width = open ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          overflowX: 'hidden',
          transition: 'width 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Logo */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: open ? 'space-between' : 'center', minHeight: 64 }}>
        {open && (
          <Box>
            <Typography variant="h6" fontWeight={700} color="primary" lineHeight={1}>BIP</Typography>
            <Typography variant="caption" color="text.secondary" lineHeight={1}>Business Insights Pro</Typography>
          </Box>
        )}
        <IconButton size="small" onClick={() => dispatch(toggleSidebar())}>
          {open ? <ChevronLeft /> : <ChevronRight />}
        </IconButton>
      </Box>

      {/* Company badge */}
      {open && company && (
        <Box sx={{ px: 2, pb: 1.5 }}>
          <Chip
            label={company.name}
            size="small"
            variant="outlined"
            color="primary"
            sx={{ width: '100%', justifyContent: 'flex-start', fontSize: 11 }}
          />
        </Box>
      )}

      <Divider />

      {/* Nav items */}
      <List sx={{ px: 1, py: 1, flex: 1, overflowY: 'auto' }}>
        {(NAV_ITEMS as NavItemDef[]).map((item, i) => {
          if (item.divider) return <Divider key={i} sx={{ my: 1 }} />;

          const active = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path!));

          return (
            <Tooltip key={i} title={!open ? item.label : ''} placement="right">
              <ListItemButton
                onClick={() => navigate(item.path!)}
                selected={active}
                sx={{
                  borderRadius: 2, mb: 0.25, minHeight: 40,
                  justifyContent: open ? 'flex-start' : 'center',
                  px: open ? 1.5 : 1,
                  '&.Mui-selected': {
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                    color: 'primary.main',
                    '& .MuiListItemIcon-root': { color: 'primary.main' },
                    '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.16) },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: open ? 36 : 0, color: active ? 'primary.main' : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: active ? 600 : 400 }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      <Divider />

      {/* User */}
      <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </Avatar>
        {open && user && (
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" fontWeight={600} noWrap>{user.firstName} {user.lastName}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ textTransform: 'capitalize' }}>
              {user.role.replace('_', ' ')}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};
