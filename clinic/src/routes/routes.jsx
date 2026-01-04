import { createBrowserRouter, Navigate } from "react-router-dom";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import PendingUser from "../pages/pending/PendingUser";
import ClinicLayout from "../layouts/ClinicLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminDashboardLayout from "../layouts/AdminDashboardLayout";
import AdminDashboard from "../pages/clinic-admin/dashboard/AdminDashboard";
import SelectBranch from "../pages/clinic-admin/SelectBranch";
import SelectPlans from "../pages/clinic-admin/SelectPlans";

export const routes = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/forgotPassword", element: '' },
  {
    path: "/pending-user",
    element: <PendingUser />
  },
  // clinic
  {
    path: '/',
    element: <ClinicLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      {
        path: 'select-branch',
        element: (
          <ProtectedRoute allowedRoles={['clinic_admin']}>
            <SelectBranch />
          </ProtectedRoute>
        )
      },
      // users
      { 
        path: ':branchId/admin', 
        element: (
          <ProtectedRoute allowedRoles={['clinic_admin']}>
            <AdminDashboardLayout />,
          </ProtectedRoute>
        ),
        children: [
          { path: "select-plan", element: <SelectPlans /> },
          // main dashboard
          { index: true, element: <AdminDashboard /> },
          { path: "dashboard", element: <AdminDashboard /> },
        ]
      }
    ]
  }
], {
  basename: "/clinic" 
});