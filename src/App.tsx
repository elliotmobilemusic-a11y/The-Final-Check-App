import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { SupportHub } from './components/support/SupportHub';
import { usePreferences } from './context/PreferencesContext';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { KitchenAuditPage } from './pages/audit/KitchenAuditPage';
import { LoginPage } from './pages/system/LoginPage';
import { MenuBuilderPage } from './pages/menu/MenuBuilderPage';
import { NotFoundPage } from './pages/system/NotFoundPage';
import { ClientsPage } from './pages/clients/ClientsPage';
import { ClientProfilePage } from './pages/clients/ClientProfilePage';
import { NewClientPage } from './pages/clients/NewClientPage';
import { SettingsPage } from './pages/settings/SettingsPage';

function HomeRedirect() {
  const { preferences } = usePreferences();
  return <Navigate to={preferences.defaultLandingPage} replace />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomeRedirect />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/new" element={<NewClientPage />} />
          <Route path="clients/:clientId" element={<ClientProfilePage />} />
          <Route path="clients/:clientId/:section" element={<ClientProfilePage />} />
          <Route path="audit" element={<KitchenAuditPage />} />
          <Route path="menu" element={<MenuBuilderPage />} />
          <Route path="settings" element={<Navigate to="/settings/profile" replace />} />
          <Route path="settings/:section" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <SupportHub />
    </>
  );
}
