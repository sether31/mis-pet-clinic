import { createBrowserRouter } from "react-router-dom";
import Login from "../pages/auth/Login";
import DashboardLayout from "../layouts/DashboardLayout";
import Dashboard from "../pages/dashboard/Dashboard";
import ProtectedRoute from "../components/ProtectedRoute";

export const routes = createBrowserRouter([
  { path: "login", element: <Login /> },
  { 
    path: "dashboard", 
    element: (
      <ProtectedRoute allowedRoles={['super_admin']} >
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "", element: <Dashboard /> },
    ]
  }
]);