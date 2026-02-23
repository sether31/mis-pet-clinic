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
import Dashboard from "../pages/dashboard/Dashboard";
import ClinicApplications from "../pages/dashboard/ClinicApplications";
import RegisteredClinics from "../pages/dashboard/RegisteredClinics";
import PlatformAnalytics from "../pages/dashboard/PlatformAnalytics";
import NotFoundDashboard from "../pages/dashboard/NotFoundDashboard";
import SubscriptionPlans from "../pages/subscription/SubscriptionPlans"
import ServiceManagement from "../pages/service-management/ServiceManagement";
  // other links
import Settings from "../pages/Navigation/Settings/Settings";
import ForgotPassword from "../pages/auth/ForgotPassword";
import GeneralSettings from "../pages/Navigation/Settings/components/GeneralSettings";
import SecuritySettings from "../pages/Navigation/Settings/components/SecuritySettings";
import TransactionManagement from "../pages/transaction-management/TransactionManagement";

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
          { path: "subscription-plans", element: <SubscriptionPlans />},
          { path: "transaction-management", element: <TransactionManagement />},
          { path: "service-management", element: <ServiceManagement />},
          { path: "platform-analytics", element: <PlatformAnalytics /> },
          // other links
          { 
            path: "settings", 
            element: <Settings />,
            children: [
              { index: true, element: <GeneralSettings /> },
              { path: "security", element: <SecuritySettings /> }, 
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