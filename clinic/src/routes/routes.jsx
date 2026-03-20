import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
// components
import ProtectedRoute from "../components/ProtectedRoute";
// context
import PlatformProvider from "../contexts/PlatformProvider";
import UIProvider from "../contexts/UIProvider";
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
import SelectBranch from "../pages/clinic-admin/SelectBranch";
import SelectPlans from "../pages/clinic-admin/SelectPlans";
import PaymentSuccess from "../pages/clinic-admin/payments/PaymentSuccess";
  // portal
import DashboardController from "../pages/portal/dashboard/DashboardController";
import NotFoundDashboard from "../pages/portal/NotFoundDashboard";
import StaffManagement from "../pages/portal/staff-management/StaffManagement";
import AppointmentManagement from "../pages/portal/appointment-management/AppointmentManagement";
import ServiceManagement from "../pages/portal/service-management/ServiceManagement";
import BranchSettings from "../pages/portal/branch-settings/BranchSettings";
import GeneralBranchSettings from "../pages/portal/branch-settings/GeneralBranchSettings";
import BranchScheduleSettings from "../pages/portal/branch-settings/BranchScheduleSettings";
import InventoryManagement from "../pages/portal/inventory-management/InventoryManagement";
import MedicalRecordManagement from "../pages/portal/medical-records/MedicalRecordManagement";
import BranchSubscriptionSettings from "../pages/portal/branch-settings/BranchSubscriptionSettings";
import TransactionManagement from "../pages/portal/transaction-management/TransactionManagement";
import ForgotPassword from "../pages/auth/ForgotPassword";
import Settings from "../pages/navigation/settings/Settings";
import ShopManagement from "../pages/portal/shop-reservation/ShopManagement";
import Notifications from "../pages/navigation/notifications/Notifications";
import Analytics from "../pages/portal/analytics/Analytics";


export const routes = createBrowserRouter([
  { path: "*", element: <NotFound /> },
  {
    path: "/clinic",
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
      // authentication
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "pending-user", element: <PendingUser /> },
      { path: "payment-success", element: <ProtectedRoute allowedRoles={['clinic_admin', 'branch_admin']}><PaymentSuccess /></ProtectedRoute> },

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
            element: <BranchVerificationLayout />, 
            children: [
              { 
                path: "select-plan", 
                element: (
                  <ProtectedRoute allowedRoles={['clinic_admin']}>
                    <SelectPlans />
                  </ProtectedRoute>
                ) 
              },
              {
                path: "portal",
                element: (
                  <ProtectedRoute allowedRoles={['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']}>
                    <SidebarLayout />
                  </ProtectedRoute>
                ),
                children: [
                  { index: true, element: <Navigate to="dashboard" replace /> },
                  { path: "dashboard", element: <DashboardController /> },
                  { 
                    path: "appointment-management", 
                    element: (
                      <ProtectedRoute requiredPermission="appointment_management">
                        <AppointmentManagement />
                      </ProtectedRoute>
                    )
                  },
                  { 
                    path: "shop-management", 
                    element: (
                      <ProtectedRoute requiredPermission="shop_management">
                        <ShopManagement />
                      </ProtectedRoute>
                    )
                  },
                  { 
                    path: "medical-record-management", 
                    element: (
                      <ProtectedRoute requiredPermission="medical_record_management">
                        <MedicalRecordManagement />
                      </ProtectedRoute>
                    )
                  },
                  { 
                    path: "staff-management", 
                    element: (
                    <ProtectedRoute 
                      allowedRoles={['clinic_admin', 'branch_admin']}
                      requiredPermission="staff_management"
                    >
                      <StaffManagement />
                    </ProtectedRoute>
                    )
                  },
                  { 
                    path: "transaction-management", 
                    element: (
                    <ProtectedRoute 
                      requiredPermission="transaction_management"
                    >
                      <TransactionManagement />
                    </ProtectedRoute>
                    ) 
                  },
                  { 
                    path: "inventory-management", 
                    element: (
                    <ProtectedRoute 
                      requiredPermission="inventory_management"
                    >
                      <InventoryManagement />
                    </ProtectedRoute>
                    ) 
                  },
                  { 
                    path: "service-management", 
                    element: (
                    <ProtectedRoute
                      allowedRoles={['clinic_admin', 'branch_admin']}
                      requiredPermission="service_management"
                    >
                      <ServiceManagement />
                    </ProtectedRoute>
                    ) 
                  },
                  {
                    path: "analytics",
                    element: (
                      <ProtectedRoute 
                        allowedRoles={['clinic_admin', 'branch_admin']}
                        requiredPermission="analytics"
                      >
                        <Analytics />
                      </ProtectedRoute>
                    )
                  },
                  { 
                    path: "branch-settings", 
                    element: (
                    <ProtectedRoute 
                      allowedRoles={['clinic_admin', 'branch_admin']}
                      requiredPermission="branch_settings"
                    >
                      <BranchSettings />
                    </ProtectedRoute>
                    ),
                    children: [
                      { index: true, element: <GeneralBranchSettings /> },
                      { path: "schedule", element: <BranchScheduleSettings /> },
                      { path: "subscription", element: <BranchSubscriptionSettings /> },
                    ]
                  },
                  { 
                    path: "notifications", 
                    element: <Notifications />
                  },
                  { 
                    path: "settings", 
                    element: <Settings />
                  },
                  { path: "*", element: <NotFoundDashboard />},
                ]
              }
            ]
          }
        ]
      }
    ],
  },
]);
