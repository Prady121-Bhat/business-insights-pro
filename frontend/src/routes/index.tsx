import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoadingState } from '../components/common/LoadingState';

const load = (factory: () => Promise<{ default: React.ComponentType<any> }>) => {
  const Component = lazy(factory);
  return (
    <Suspense fallback={<LoadingState />}>
      <Component />
    </Suspense>
  );
};

const OverviewDashboard = () => load(() => import('../features/dashboard/OverviewDashboard').then((m) => ({ default: m.OverviewDashboard })));
const LoginPage = () => load(() => import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = () => load(() => import('../features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <OverviewDashboard /> },
      { path: 'analytics/revenue', element: load(() => import('../features/dashboard/OverviewDashboard').then((m) => ({ default: m.OverviewDashboard }))) },
      { path: 'analytics/customers', element: load(() => import('../features/customers/CustomerAnalyticsPage').then((m) => ({ default: m.CustomerAnalyticsPage }))) },
      { path: 'analytics/inventory', element: load(() => import('../features/products/InventoryAnalyticsPage').then((m) => ({ default: m.InventoryAnalyticsPage }))) },
      { path: 'analytics/expenses', element: load(() => import('../features/expenses/ExpensesPage').then((m) => ({ default: m.ExpensesPage }))) },
      { path: 'forecasting', element: load(() => import('../features/forecasting/ForecastingPage').then((m) => ({ default: m.ForecastingPage }))) },
      { path: 'sales', element: load(() => import('../features/sales/SalesPage').then((m) => ({ default: m.SalesPage }))) },
      { path: 'products', element: load(() => import('../features/products/ProductsListPage').then((m) => ({ default: m.ProductsListPage }))) },
      { path: 'reports', element: load(() => import('../features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage }))) },
      { path: 'imports', element: load(() => import('../features/imports/ImportPage').then((m) => ({ default: m.ImportPage }))) },
      { path: 'insights', element: load(() => import('../features/insights/AIInsightsPage').then((m) => ({ default: m.AIInsightsPage }))) },
      { path: 'notifications', element: load(() => import('../features/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))) },
      { path: 'settings', element: load(() => import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))) },
      { path: 'settings/profile', element: load(() => import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))) },
      { path: 'settings/notifications', element: load(() => import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))) },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
