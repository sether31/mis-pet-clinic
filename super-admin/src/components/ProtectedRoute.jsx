import { Navigate } from "react-router-dom";
// hooks
import { useUser } from "../hooks/useUser";
// components
import FullScreenLoader from "./FullScreenLoader";

export default function ProtectedRoute({ children, allowedRoles = ['super_admin'] }) {
  const { user, loading } = useUser();

  if(loading) {
    return <FullScreenLoader message="Checking session..." />;
  }

  const isAllowed = user && allowedRoles.includes(user.role);

  if(!isAllowed) {
    return <Navigate to="/login" replace />;
  }

  return children;
}