import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
// components
import { validRoleToken } from "../../utils/validRoleToken";
import FullScreenLoader from "../../components/FullLoader";
import wait from "../../utils/wait";

export default function PendingUser() {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState('Loading...'); 
  
  useEffect(() => {
    const checkToken = async () => {
      const user = validRoleToken();
      
      // check if invalid
      if(!user) {
        setMessage('Session expired. Redirecting to login...');
        await wait(2000);
        setChecking(false);
        setAllowed(false);
        return;
      }

      const { role, status } = user;

      // if clinic admin pending
      if(role === "clinic_admin" && status === "pending") {
        setAllowed(true);
      } else {
        setAllowed(false);
      }

      setChecking(false);
    };

    checkToken();
  }, []);


  if(checking) {
    return <FullScreenLoader message={message} />;
  }

  if(!allowed) {
    return <Navigate to="/login" replace />;
  }

  
  return (
    <div>
      <h1 className="mt-5 text-5xl italic font-bold text-center text-blue-500">
        PENDING USER
      </h1>
    </div>
  );
}
