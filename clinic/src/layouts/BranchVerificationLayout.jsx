import { useEffect, useState } from 'react';
import { useParams, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
// utils
import { authFetch } from '../utils/authFetch';
// components
import FullScreenLoader from '../components/FullLoader';

const API_URL = import.meta.env.VITE_API_URL;

export default function BranchVerificationLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { branchId } = useParams();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyAccess = async () => {
      setIsVerifying(true);
      try {
        const response = await authFetch(`${API_URL}/api/clinic/clinic-admin/branches/verify-branch.php`, {
          method: 'POST',
          body: JSON.stringify({ branch_id: branchId })
        });

        const isAdmin = response?.role === 'clinic_admin';
        const isPlanPage = location.pathname.includes('select-plan');

        // check if wrong branchid or not approve
        if(!response || !response.success) {
          if(response?.reason === "not_approved") {
            toast.warn("Branch pending approval.");
          } else {
            toast.warn("Unauthorized access to this clinic branch.");
          }

          // redirect admin to select-branch and staff to login 
          isAdmin ? navigate('/clinic/select-branch', { replace: true }) : navigate('/clinic/login', { replace: true });
          return;
        }

        // 
        if(isPlanPage) {
          if(!isAdmin) {
            // block staff on select plan
            navigate('/clinic/login', { replace: true });
            return;
          }
          if(response.hasSubscription) {
            // check if have post subscription
            navigate(`/clinic/${branchId}/portal/dashboard`, { replace: true });
            return;
          }
        }

        // if no subscription yet then redirect to select plan
        if(isAdmin && !response.hasSubscription && !isPlanPage) {
          navigate(`/clinic/${branchId}/select-plan`, { replace: true });
          return;
        }

        setIsVerifying(false);
      } catch(err) {
        console.error("error:", err);
        navigate('/clinic/login', { replace: true });
      }
    };

    if (branchId) verifyAccess();

  }, [branchId, location.pathname, navigate]);

  if (isVerifying) return <FullScreenLoader message="Verifying Branch..." />;

  return <Outlet />;
}