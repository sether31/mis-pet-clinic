import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useUser } from "../hooks/useUser";
import { useUI } from "../hooks/useUI";
import { getDashboardByRole } from "../utils/getDashboardByRole";

export default function ProtectedRoute({ children, requiredPermission, allowedRoles = [] }) {
  const { user, loading } = useUser();
  const { showLoader, hideLoader } = useUI();
  const { branchId } = useParams();

  useEffect(() => {
    loading ? showLoader("Checking permissions...") : hideLoader();
    return () => hideLoader();
  }, [loading]);

  if (loading) return null;

  if (!user) return <Navigate to="/clinic/login" replace />;

  const isGlobalAdmin = user.role === 'clinic_admin';
  const hasRoleMatch = allowedRoles.includes(user.role);
  const hasPermission = user.permissions?.includes(requiredPermission);

  const isAuthorized = isGlobalAdmin || hasRoleMatch || (requiredPermission && hasPermission);

  if(!isAuthorized) {
    const fallback = getDashboardByRole(user.role, branchId || user.branch_id);
    return <Navigate to={fallback || "/clinic/login"} replace />;
  }

  return children;
}