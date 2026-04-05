import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
// components
import ProtectedRoute from "../components/ProtectedRoute";
// context
import PlatformProvider from "../contexts/PlatformProvider";
import UserProvider from "../contexts/UserProvider";
import UIProvider from "../contexts/UiProvider";
// layout
import DashboardLayout from "../layouts/DashboardLayout";
// pages
  // auth
import NotFound from "../pages/NotFound";
import Login from "../pages/auth/Login";
  // main
import Dashboard from "../pages/portal/dashboard/Dashboard";
import ClinicApplications from "../pages/portal/clinic-applications/ClinicApplications";
import RegisteredClinics from "../pages/portal/registered-clinics/RegisteredClinics";
import PlatformAnalytics from "../pages/portal/platform-analytics/PlatformAnalytics";
import SubscriptionPlans from "../pages/portal/subscription-management/SubscriptionPlans"
import ServiceManagement from "../pages/portal/service-management/ServiceManagement";
import TransactionManagement from "../pages/portal/transaction-management/TransactionManagement";
  // other links
import Notifications from "../pages/Navigation/notifications/Notifications";
import Settings from "../pages/Navigation/Settings/Settings";
import ForgotPassword from "../pages/auth/ForgotPassword";
import GeneralSettings from "../pages/Navigation/Settings/view/GeneralSettings";
import SecuritySettings from "../pages/Navigation/Settings/view/SecuritySettings";
import NotFoundDashboard from "../pages/portal/NotFoundDashboard";
import Announcement from "../pages/Navigation/Settings/view/Announcement";
import FAQSettings from "../pages/Navigation/Settings/view/FAQSettings";


export const routes = createBrowserRouter([
  {
    element: (
      <PlatformProvider>
        <UserProvider>
          <UIProvider>
            <Outlet /> 
          </UIProvider>
        </UserProvider>
      </PlatformProvider>
    ),
    children: [
      { 
        path: "/login", 
        element: <Login /> 
      },
      { 
        path: "/forgot-password", 
        element: <ForgotPassword /> 
      },
      { 
        path: "/", 
        element: (
          <ProtectedRoute allowedRoles={['super_admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <Dashboard /> },
          { path: "clinic-applications", element: <ClinicApplications /> },
          { path: "registered-clinics", element: <RegisteredClinics /> },
          { path: "subscription-management", element: <SubscriptionPlans />},
          { path: "transaction-management", element: <TransactionManagement />},
          { path: "service-management", element: <ServiceManagement />},
          { path: "platform-analytics", element: <PlatformAnalytics /> },
          // other links
          { path: "notifications", element: <Notifications /> },
          { 
            path: "settings", 
            element: <Settings />,
            children: [
              { index: true, element: <GeneralSettings /> },
              { path: "account-security", element: <SecuritySettings /> }, 
              { path: "announcement", element: <Announcement /> },
              { path: "faq", element: <FAQSettings /> }
            ]
          },
          { path: "*", element: <NotFoundDashboard /> },
        ]
      },
      { path: '*', element: <NotFound /> },
    ]
  }
], {
  basename: "/super-admin" 
});