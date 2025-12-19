import { createBrowserRouter } from "react-router-dom";
// pages
import Login from "../pages/auth/Login";
import DashboardLayout from "../layouts/DashboardLayout";
import Dashboard from "../pages/dashboard/Dashboard";
// protected route component
import ProtectedRoute from "../components/ProtectedRoute";
// context
import UserProvider from "../contexts/UserProvider";
import NotFound from "../pages/NotFound";


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
      { index: true, element: <Dashboard /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "clinic-applications", element: '' },
      { path: "registered-clinics", element: '' },
      { path: "platform-analytics", element: '' },
    ]
  },
  {
    path: '*',
    element: <NotFound />
  }
]);