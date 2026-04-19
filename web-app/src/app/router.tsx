import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';

import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ConsolePage } from '../pages/dashboard/ConsolePage';
import { OperationPage } from '../pages/operation/OperationPage';
import { SalesPage } from '../pages/sales/SalesPage';
import { SettingsPage } from '../pages/settings/SettingsPage';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/console" replace /> },
      { path: 'console', element: <ConsolePage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'sales', element: <SalesPage /> },
      { path: 'operation', element: <OperationPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
