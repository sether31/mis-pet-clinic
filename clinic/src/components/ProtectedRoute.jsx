import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
// hooks
import { useUser } from "../hooks/useUser";
import { useUI } from "../hooks/useUI"; 
// utils
import { getDashboardByRole } from "../utils/getDashboardByRole";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading: userLoading } = useUser();
  const { showLoader, hideLoader } = useUI(); 
  const { branchId } = useParams();
  const [redirect, setRedirect] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if(userLoading) {
      showLoader("Verifying access..."); 
      return;
    }

    // check if have user
    if(!user) {
      hideLoader();
      setRedirect("/clinic/login");
      return;
    }

    const { role, status, branch_id: userBranchId } = user;

    // check if pending admin
    if (role === "clinic_admin" && (status === "pending" || status === "rejected")) {
      hideLoader();
      setRedirect("/clinic/pending-user");
      return;
    }

    // check role auth
    if(allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      hideLoader();
      
      // get the params id or user as fallback
      const target = getDashboardByRole(role, branchId || userBranchId);

      setRedirect(target || "/clinic/login");
      return;
    }

    setIsAuthorized(true);
    hideLoader();
  }, [user, userLoading, allowedRoles, branchId, showLoader, hideLoader]);

  if(redirect) {
    return <Navigate to={redirect} replace />;
  }

  return isAuthorized ? children : null;
}