import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { HiOutlineInformationCircle } from "react-icons/hi2"; 
import Header from "../../../components/Header";
import { authFetch } from '../../../utils/authFetch';
import { useUI } from '../../../hooks/useUI';

const API_URL = import.meta.env.VITE_API_URL;

export default function AdminDashboard() {
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

        if(res.success) {
          setBranchData(res.data);
        }
      } catch(err) {
        console.error("Failed to load branch details", err);
      } finally {
        hideLoader();
      }
    };

    fetchBranchDetails();
  }, [branchId]);

  const isMaintenance = branchData && Number(branchData.is_maintenance) === 1;

  if (!branchData && loading) return null;

  return (
    <div className='bg-(--clr-bg-page) min-h-screen'>
      <Header />
      <section className='my-6 container-xl'>

      {isMaintenance && (
        <div className="flex items-center justify-between p-3 mb-6 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <HiOutlineInformationCircle size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-amber-900 uppercase tracking-tight">
                Branch Offline
              </span>
              <span className="text-[11px] text-amber-700 font-medium">
                Maintenance mode is active. Your branch is hidden from the public booking page.
              </span>
            </div>
          </div>
          <button 
            onClick={() => navigate(`/clinic/${branchId}/portal/branch-settings/schedule`)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 cursor-pointer"
          >
            Configure Now
          </button>
        </div>
      )}
        
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
            </div>
            <p className="text-sm text-gray-500 font-medium">Welcome back! Managing {branchData?.name}.</p>
          </div>
        </div>
      </section>
    </div>
  );
}