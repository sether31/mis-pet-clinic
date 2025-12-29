import { useEffect, useState } from 'react';
import { useParams, useNavigate, Outlet } from 'react-router-dom';
// utils
import { authFetch } from '../utils/authFetch';
// components
import FullScreenLoader from '../components/FullLoader';

const API_URL = import.meta.env.VITE_API_URL;

export default function AdminDashboardLayout() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        setIsVerifying(true);
        
        const response = await authFetch(`${API_URL}/api/clinic/clinic-admin/verify-branch.php`, {
          method: 'POST',
          body: JSON.stringify({ branch_id: branchId })
        }, ['clinic_admin']);
        
        // check if unauthorized
        if(response.status === 403) {
          navigate('/clinic/select-branch', { replace: true });
          return;
        }

        if(!response.success) {
          navigate('/clinic/select-branch', { replace: true });
          return;
        }
        
        localStorage.setItem('active_clinic_id', branchId);
        setIsVerifying(false);
      } catch(err) {
        console.error("Error:", err);
        navigate('/clinic/select-branch', { replace: true });
      }
    };

    if (branchId) verifyAccess();
  }, [branchId, navigate]);


  // loader
  if(isVerifying) {
    return <FullScreenLoader message="Verifying clinic access..." />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}