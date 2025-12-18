import { createBrowserRouter } from "react-router-dom";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import PendingUser from "../pages/pending/PendingUser";
import ClinicLayout from "../layouts/ClinicLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminDashboardLayout from "../layouts/AdminDashboardLayout";
import AdminDashboard from "../pages/clinic-admin/dashboard/AdminDashboard";;

export const routes = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/forgotPassword", element: '' },
  {
    path: "/pendingUser",
    element: <PendingUser />
  },
  {
    path: '/clinic',
    element: <ClinicLayout />,
    children: [
      { 
        path: 'admin', 
        element: (
          <ProtectedRoute allowedRoles={['clinic_admin']}>
            <AdminDashboardLayout />,
          </ProtectedRoute>
        ),
        children: [
          { path: "dashboard", element: <AdminDashboard /> }
        ]
      }
    ]
  }
]);