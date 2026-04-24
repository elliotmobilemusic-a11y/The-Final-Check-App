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
const SharedFoodSafetyAuditPage = lazy(() =>
  import('./pages/share/SharedFoodSafetyAuditPage').then((module) => ({
    default: module.SharedFoodSafetyAuditPage
  }))
);
const SharedMysteryShopAuditPage = lazy(() =>
  import('./pages/share/SharedMysteryShopAuditPage').then((module) => ({
    default: module.SharedMysteryShopAuditPage
  }))
);
const SharedMenuPage = lazy(() =>
  import('./pages/share/SharedMenuPage').then((module) => ({ default: module.SharedMenuPage }))
);
const SharedReportPage = lazy(() =>
  import('./pages/share/SharedReportPage').then((module) => ({ default: module.SharedReportPage }))
);
const SharedDishSpecPage = lazy(() =>
  import('./pages/share/SharedDishSpecPage').then((module) => ({ default: module.SharedDishSpecPage }))
);
const SharedRecipeCostingPage = lazy(() =>
  import('./pages/share/SharedRecipeCostingPage').then((module) => ({
    default: module.SharedRecipeCostingPage
  }))
);
const ClientIntakePage = lazy(() =>
  import('./pages/share/ClientIntakePage').then((module) => ({ default: module.ClientIntakePage }))
);
const ClientPortalPage = lazy(() =>
  import('./pages/share/ClientPortalPage').then((module) => ({ default: module.ClientPortalPage }))
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
        <Route path="/share/food-safety/:token" element={<SharedFoodSafetyAuditPage />} />
        <Route path="/share/mystery-shop/:token" element={<SharedMysteryShopAuditPage />} />
        <Route path="/share/menu/:token" element={<SharedMenuPage />} />
        <Route path="/share/report/:token" element={<SharedReportPage />} />
        <Route path="/share/dish-spec/:token" element={<SharedDishSpecPage />} />
        <Route path="/share/recipe-costing/:token" element={<SharedRecipeCostingPage />} />
         <Route path="/intake/client/:token" element={<ClientIntakePage />} />
         <Route path="/contact" element={<ClientIntakePage />} />
         <Route path="/portal/client/:token" element={<ClientPortalPage />} />

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
