import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { SupportHub } from './components/SupportHub';
import { DashboardPage } from './pages/DashboardPage';
import { KitchenAuditPage } from './pages/KitchenAuditPage';
import { LoginPage } from './pages/LoginPage';
import { MenuBuilderPage } from './pages/MenuBuilderPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientProfilePage } from './pages/ClientProfilePage';

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
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:clientId" element={<ClientProfilePage />} />
          <Route path="audit" element={<KitchenAuditPage />} />
          <Route path="menu" element={<MenuBuilderPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <SupportHub />
    </>
  );
}
