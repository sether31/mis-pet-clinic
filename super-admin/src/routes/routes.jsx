import { createBrowserRouter } from "react-router-dom";
// protected route component
import ProtectedRoute from "../components/ProtectedRoute";
// context
import UserProvider from "../contexts/UserProvider";
import UIProvider from "../contexts/UiProvider";
// pages
import NotFound from "../pages/NotFound";
import Login from "../pages/auth/Login";
import DashboardLayout from "../layouts/DashboardLayout";
import Dashboard from "../pages/dashboard/Dashboard";
import ClinicApplications from "../pages/dashboard/ClinicApplications";
import RegisteredClinics from "../pages/dashboard/RegisteredClinics";
import PlatformAnalytics from "../pages/dashboard/PlatformAnalytics";
import NotFoundDashboard from "../pages/dashboard/NotFoundDashboard";
import SubscriptionPlans from "../pages/dashboard/SubscriptionPlans"



export const routes = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { 
    path: "/super-admin", 
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
      { index: true, element: <Dashboard /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "clinic-applications", element: <ClinicApplications /> },
      { path: "registered-clinics", element: <RegisteredClinics /> },
      { path: "platform-analytics", element: <PlatformAnalytics /> },
      { path: "subscription-plans", element: <SubscriptionPlans />}
    ]
  },
  {
    path: '*',
    element: <NotFound />
  }
]);