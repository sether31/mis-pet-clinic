import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
// hooks
import { useUser } from "../../../hooks/useUser";
import { useUI } from "../../../hooks/useUI";
// pages
import AdminDashboard from "./AdminDashboard";
import BranchAdminDashboard from "./BranchAdminDashboard";
import VeterinarianDashboard from "./VeterinarianDashboard";
import GroomerDashboard from "./GroomerDashboard";
import StaffDashboard from "./StaffDashboard";


export function DashboardSwitch() {
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const { showLoader, hideLoader } = useUI();

  useEffect(() => {
    if(loading) {
      showLoader();
    } else {
      hideLoader();
    }
    
    return () => hideLoader();
  }, [loading, showLoader, hideLoader]);


  if(!user) {
    navigate('/clinic/login', { replace: true });
    return null;
  }
  
  const dashboards = {
    clinic_admin: <AdminDashboard />,
    branch_admin: <BranchAdminDashboard />,
    veterinarian: <VeterinarianDashboard />,
    groomer: <GroomerDashboard />,
  };

  
  return dashboards[user.role] || <StaffDashboard />;
}
