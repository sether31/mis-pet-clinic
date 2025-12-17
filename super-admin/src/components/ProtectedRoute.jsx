import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

// components
import FullScreenLoader from "./FullLoader";
import wait from "../utils/wait";
import { validRoleToken } from "../utils/validRoleToken";

export default function ProtectedRoute({ children, allowedRoles = ['super_admin']  }) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState('Loading...'); 

  useEffect(() => {
    const checkToken = async () => {
      const role = validRoleToken(allowedRoles);
      // check if token is invalid
      if(!role) {
        setMessage('Session expired. Redirecting to login...');
        await wait(2000);
        setAllowed(false);
        setChecking(false);
        return;
      }
      
      // token valid
      setMessage('Loading...');
      setAllowed(true);
      setChecking(false);
    };

    checkToken();
  }, [allowedRoles]);

  if(checking) {
    return (
      <FullScreenLoader message={message} />
    )
  }

  if(!allowed) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
