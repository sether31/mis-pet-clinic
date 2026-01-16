import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
// components
import ProtectedRoute from "../components/ProtectedRoute";
// hooks
import UIProvider from "../contexts/UiProvider";
import UserProvider from "../contexts/UserProvider";
// layout
import ClinicLayout from "../layouts/ClinicLayout";
import BranchVerificationLayout from "../layouts/BranchVerificationLayout";
import SidebarLayout from "../layouts/SidebarLayout";
// pages
import NotFound from "../pages/NotFound";
  // auth
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import PendingUser from "../pages/pending/PendingUser";
  // clinic admin
import AdminDashboard from "../pages/portal/dashboard/AdminDashboard";
import SelectBranch from "../pages/clinic-admin/SelectBranch";
import SelectPlans from "../pages/clinic-admin/SelectPlans";
import PaymentSuccess from "../pages/clinic-admin/payments/PaymentSuccess";
import PaymentFailed from "../pages/clinic-admin/payments/PaymentFailed";
import NotFoundDashboard from "../pages/portal/NotFoundDashboard";
import StaffManagement from "../pages/portal/staff-management/StaffManagement";


export const routes = createBrowserRouter([
  { path: "*", element: <NotFound /> },
  {
    path: "/clinic",
    element: (
      <UserProvider>
        <UIProvider>
          <Outlet />
        </UIProvider>
      </UserProvider>
    ),
    children: [
      // authentication
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "forgotPassword", element: "" },
      { path: "pending-user", element: <PendingUser /> },
      { path: "payment-success", element: <ProtectedRoute allowedRoles={['clinic_admin']}><PaymentSuccess /></ProtectedRoute> },
      { path: "payment-failed", element: <ProtectedRoute allowedRoles={['clinic_admin']}><PaymentFailed /></ProtectedRoute> },

      // clinic
      {
        path: "",
        element: <ClinicLayout />,
        children: [
          { index: true, element: <Navigate to="/clinic/select-branch" replace /> },
          {
            path: "select-branch",
            element: (
              <ProtectedRoute allowedRoles={['clinic_admin']}>
                <SelectBranch />
              </ProtectedRoute>
            )
          },
          {
            path: ":branchId",
            children: [
              {
                element: <BranchVerificationLayout />,
                children: [
                  { path: "select-plan", element: <SelectPlans /> },
                ]
              },

              // user portal
              {
                path: "portal",
                element: (
                  <ProtectedRoute allowedRoles={['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']}>
                    <SidebarLayout />
                  </ProtectedRoute>
                ),
                children: [
                  { index: true, element: <Navigate to="dashboard" replace /> },
                  { path: "*", element: <NotFoundDashboard />},
                  { path: "dashboard", element: <AdminDashboard /> },     
                  { path: "staff-management", element: (
                    <ProtectedRoute allowedRoles={['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']}>
                      <StaffManagement />
                    </ProtectedRoute>
                  ) }, 
                ]
              }
            ]
          }
        ]
      }
    ]
  },
]);
