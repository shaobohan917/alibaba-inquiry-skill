import { HashRouter, Navigate, Routes, Route } from 'react-router';

import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ConsolePage } from '../pages/dashboard/ConsolePage';
import { OperationPage } from '../pages/operation/OperationPage';
import { SalesPage } from '../pages/sales/SalesPage';
import { SettingsPage } from '../pages/settings/SettingsPage';

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/console" replace />} />
          <Route path="console" element={<ConsolePage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="operation" element={<OperationPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
