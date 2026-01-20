import { createBrowserRouter, Navigate } from "react-router-dom";
// components
import ProtectedRoute from "../components/ProtectedRoute";
// context
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


export const routes = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { 
    path: "/", 
    element: (
      <ProtectedRoute allowedRoles={['super_admin']} >
        <UserProvider>
          <UIProvider>
            <DashboardLayout />
          </UIProvider>
        </UserProvider>
      </ProtectedRoute>
    ),
    children: [
      { path: "*", element: <NotFoundDashboard /> },
      { index: true, element: <Navigate to="dashboard" replace /> },
      // main dashboard
      { path: "dashboard", element: <Dashboard /> },
      { path: "clinic-applications", element: <ClinicApplications /> },
      { path: "registered-clinics", element: <RegisteredClinics /> },
      { path: "platform-analytics", element: <PlatformAnalytics /> },
      { path: "subscription-plans", element: <SubscriptionPlans />}
    ]
  },
  { path: '*', element: <NotFound /> },
], {
  basename: "/super-admin" 
});