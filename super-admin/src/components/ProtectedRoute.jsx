import { Navigate } from "react-router-dom";
// hooks
import { useUser } from "../hooks/useUser";

export default function ProtectedRoute({ children, allowedRoles = ['super_admin'] }) {
  const { user, loading } = useUser();

  if(loading) {
    return null;
  }

  const isAllowed = user && allowedRoles.includes(user.role);

  if(!isAllowed) {
    return <Navigate to="/login" replace />;
  }

  return children;
}