import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import FullScreenLoader from "./FullLoader";
import wait from "../utils/wait";
import { validRoleToken } from "../utils/validRoleToken";
import getDashboardByRole from "../utils/getDashboardByRole";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const [checking, setChecking] = useState(true);
  const [redirect, setRedirect] = useState(null);
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    const checkToken = async () => {
      const user = validRoleToken();

      // check if invalid
      if(!user) {
        setMessage("Session expired. Redirecting to login...");
        await wait(1500);
        setRedirect("/login");
        setChecking(false);
        return;
      }

      const { role, status } = user;

      // if clinic admin pending
      if(role === "clinic_admin" && status === "pending") {
        setRedirect("/pending-user");
        setChecking(false);
        return;
      }

      // check if roles are not allowed
      if(allowedRoles.length && !allowedRoles.includes(role)) {
        setRedirect(getDashboardByRole(role));
        setChecking(false);
        return;
      }

      setChecking(false);
    };

    checkToken();
  }, [allowedRoles]);

  if(checking) {
    return <FullScreenLoader message={message} />;
  }

  if(redirect) {
    return <Navigate to={redirect} replace />;
  }

  return children;
}
