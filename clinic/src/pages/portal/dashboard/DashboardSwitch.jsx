// hooks
import { useUser } from "../../../hooks/useUser";
// pages
import AdminDashboard from "./AdminDashboard";
import BranchAdminDashboard from "./BranchAdminDashboard";
import VeterinarianDashboard from "./VeterinarianDashboard";
import GroomerDashboard from "./GroomerDashboard";
import StaffDashboard from "./StaffDashboard";


export function DashboardSwitch() {
  const { user } = useUser();

  if (user.role === 'clinic_admin') return <AdminDashboard />;
  if (user.role === 'branch_admin') return <BranchAdminDashboard />;
  if (user.role === 'veterinarian') return <VeterinarianDashboard />;
  if (user.role === 'groomer') return <GroomerDashboard />;
  
  return <StaffDashboard />;
}
