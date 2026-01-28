import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useEffect, useState } from 'react';
import Header from "../../../components/Header";
import { authFetch } from '../../../utils/authFetch';
import { useUI } from '../../../hooks/useUI';

const API_URL = import.meta.env.VITE_API_URL;

export default function BranchAdminDashboard() {
  const navigate = useNavigate();
  const { showLoader, hideLoader, loading } = useUI();
  const { branchId } = useParams(); 
  const [branchData, setBranchData] = useState(null);

  useEffect(() => {
    const fetchBranchDetails = async () => {
      showLoader();
      try {
        const res = await authFetch(`${API_URL}/api/clinic/clinic-admin/branches/get-branch-data.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branch_id: branchId })
        });

        if (res.success) {
          setBranchData(res.data);

          if(Number(res.data.is_configured) === 0) {
            toast.warning("Initial Setup: Please review your operating hours.", {
              toastId: 'setup-alert', 
              autoClose: 5000
            });
          }
        }
      } catch(err) {
        console.error("Failed to load branch details", err);
      } finally {
        hideLoader()
      }
    };

    fetchBranchDetails();
  }, [branchId]);

  const showSetupBanner = branchData && parseInt(branchData.is_configured) === 0;

  if (loading) return null;

  return (
    <div className='bg-(--clr-bg-page) min-h-screen'>
      <Header />
      <section className='my-6 container-xl'>
        {showSetupBanner && (
          <div className="flex items-center justify-between p-4 mb-6 border-l-4 border-blue-500 bg-blue-50 rounded-r-xl animate-in fade-in slide-in-from-top-4">
            <div>
              <h4 className="text-sm font-bold text-blue-800">Initial Setup Required</h4>
              <p className="text-xs text-blue-600">Your branch is currently using default operating hours.</p>
            </div>
            <button 
              onClick={() => navigate('../settings')} 
              className="px-4 py-2 text-xs font-black tracking-wider text-white uppercase transition-colors bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700"
            >
              Configure Now
            </button>
          </div>
        )}
        
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
            <p className="text-sm text-gray-500">Welcome back! Here is what's happening at {branchData?.name}.</p>
          </div>
        </div>
      </section>
    </div>
  );
}