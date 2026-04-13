import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { SupportHub } from './components/support/SupportHub';
import { usePreferences } from './context/PreferencesContext';
import { AuthProvider } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { FoodSafetyAuditPage } from './pages/audit/FoodSafetyAuditPage';
import { KitchenAuditPage } from './pages/audit/KitchenAuditPage';
import { LoginPage } from './pages/system/LoginPage';
import { MenuBuilderPage } from './pages/menu/MenuBuilderPage';
import { MysteryShopAuditPage } from './pages/audit/MysteryShopAuditPage';
import { NotFoundPage } from './pages/system/NotFoundPage';
import { ClientsPage } from './pages/clients/ClientsPage';
import { ClientProfilePage } from './pages/clients/ClientProfilePage';
import { NewClientPage } from './pages/clients/NewClientPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { SharedKitchenAuditPage } from './pages/share/SharedKitchenAuditPage';
import { ClientIntakePage } from './pages/share/ClientIntakePage';

function HomeRedirect() {
  const { preferences } = usePreferences();
  return <Navigate to={preferences.defaultLandingPage} replace />;
}

function PrivateApp() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
        <SupportHub />
      </PreferencesProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <Routes>
      {/* ✅ PUBLIC ROUTES - NO PROVIDERS, NO AUTH BOOT */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/share/kitchen-audit/:token" element={<SharedKitchenAuditPage />} />
      <Route path="/intake/client/:token" element={<ClientIntakePage />} />

      {/* 🔒 PRIVATE ROUTES - PROVIDERS ONLY LOAD HERE */}
      <Route path="/*" element={<PrivateApp />}>
        <Route index element={<HomeRedirect />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/new" element={<NewClientPage />} />
        <Route path="clients/:clientId" element={<ClientProfilePage />} />
        <Route path="clients/:clientId/:section" element={<ClientProfilePage />} />
        <Route path="audit" element={<KitchenAuditPage />} />
        <Route path="food-safety" element={<FoodSafetyAuditPage />} />
        <Route path="mystery-shop" element={<MysteryShopAuditPage />} />
        <Route path="menu" element={<MenuBuilderPage />} />
        <Route path="settings" element={<Navigate to="/settings/profile" replace />} />
        <Route path="settings/:section" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
