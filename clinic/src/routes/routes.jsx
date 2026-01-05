import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
// components
import ProtectedRoute from "../components/ProtectedRoute";
// hooks
import UIProvider from "../contexts/UiProvider";
// layout
import ClinicLayout from "../layouts/ClinicLayout";
import AdminDashboardLayout from "../layouts/AdminDashboardLayout";
// pages
import NotFound from "../pages/NotFound";
  // auth
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import PendingUser from "../pages/pending/PendingUser";
  // clinic admin
import AdminDashboard from "../pages/clinic-admin/dashboard/AdminDashboard";
import SelectBranch from "../pages/clinic-admin/SelectBranch";
import SelectPlans from "../pages/clinic-admin/SelectPlans";


export const routes = createBrowserRouter([
  { path: "*", element: <NotFound /> },
  {
    path: "/clinic",
    element: (
      <UIProvider>
        <Outlet />
      </UIProvider>
    ),
    children: [
      // auth
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "forgotPassword", element: "" },
      { path: "pending-user", element: <PendingUser />},

      // clinic layout
      {
        path: "",
        element: <ClinicLayout />,
        children: [
          { index: true, element: <Navigate to="/select-branch" replace /> },
          {
            path: "select-branch",
            element: (
              <ProtectedRoute allowedRoles={['clinic_admin']}>
                <SelectBranch />
              </ProtectedRoute>
            )
          },

          // users
          { 
            path: ":branchId/admin", 
            element: (
              <ProtectedRoute allowedRoles={['clinic_admin']}>
                <AdminDashboardLayout />,
              </ProtectedRoute>
            ),
            children: [
              { index: true, element: <AdminDashboard /> },
              { path: "select-plan", element: <SelectPlans /> },
              // main dashboard
              { path: "dashboard", element: <AdminDashboard /> },
            ]
          }
        ]
      }
    ]
  },
]);

