import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { SupportHub } from './components/support/SupportHub';
import { ActivityOverlayProvider } from './context/ActivityOverlayContext';
import { usePreferences } from './context/PreferencesContext';
import { AuthProvider } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';

const DashboardPage = lazy(() =>
  import('./pages/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage }))
);
const FoodSafetyAuditPage = lazy(() =>
  import('./pages/audit/FoodSafetyAuditPage').then((module) => ({
    default: module.FoodSafetyAuditPage
  }))
);
const KitchenAuditPage = lazy(() =>
  import('./pages/audit/KitchenAuditPage').then((module) => ({ default: module.KitchenAuditPage }))
);
const LoginPage = lazy(() =>
  import('./pages/system/LoginPage').then((module) => ({ default: module.LoginPage }))
);
const MenuBuilderPage = lazy(() =>
  import('./pages/menu/MenuBuilderPage').then((module) => ({ default: module.MenuBuilderPage }))
);
const MysteryShopAuditPage = lazy(() =>
  import('./pages/audit/MysteryShopAuditPage').then((module) => ({
    default: module.MysteryShopAuditPage
  }))
);
const NotFoundPage = lazy(() =>
  import('./pages/system/NotFoundPage').then((module) => ({ default: module.NotFoundPage }))
);
const ClientsPage = lazy(() =>
  import('./pages/clients/ClientsPage').then((module) => ({ default: module.ClientsPage }))
);
const ClientProfilePage = lazy(() =>
  import('./pages/clients/ClientProfilePage').then((module) => ({
    default: module.ClientProfilePage
  }))
);
const NewClientPage = lazy(() =>
  import('./pages/clients/NewClientPage').then((module) => ({ default: module.NewClientPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/settings/SettingsPage').then((module) => ({ default: module.SettingsPage }))
);
const SharedKitchenAuditPage = lazy(() =>
  import('./pages/share/SharedKitchenAuditPage').then((module) => ({
    default: module.SharedKitchenAuditPage
  }))
);
const ClientIntakePage = lazy(() =>
  import('./pages/share/ClientIntakePage').then((module) => ({ default: module.ClientIntakePage }))
);

function HomeRedirect() {
  const { preferences } = usePreferences();
  return <Navigate to={preferences.defaultLandingPage} replace />;
}

function PrivateApp() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <ActivityOverlayProvider>
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
          <SupportHub />
        </ActivityOverlayProvider>
      </PreferencesProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="page-stack"><div className="panel"><div className="panel-body">Loading workspace...</div></div></div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/share/kitchen-audit/:token" element={<SharedKitchenAuditPage />} />
        <Route path="/intake/client/:token" element={<ClientIntakePage />} />

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
    </Suspense>
  );
}
