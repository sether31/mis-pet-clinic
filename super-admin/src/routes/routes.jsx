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
import SubscriptionPlans from "../pages/dashboard/SubscriptionPlans"
import ServiceManagement from "../pages/service-management/ServiceManagement";
  // other links
import Settings from "../pages/Navigation/Settings/Settings";

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
          { path: "service-management", element: <ServiceManagement />},
          { path: "platform-analytics", element: <PlatformAnalytics /> },
          // other links
          { path: "settings", element: <Settings /> },
          { path: "*", element: <NotFoundDashboard /> },
        ]
      },
      { path: '*', element: <NotFound /> },
    ]
  }
], {
  basename: "/super-admin" 
});