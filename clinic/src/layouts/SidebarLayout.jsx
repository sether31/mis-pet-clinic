import { useState, useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';

import Maintenance from '../pages/portal/Maintenance';
import { useUser } from '../hooks/useUser';
import { useUI } from '../hooks/useUI';
import { authFetch } from '../utils/authFetch';
import Sidebar from '../components/Sidebar';

const API_URL = import.meta.env.VITE_API_URL;

export default function SidebarLayout() {
  const { branchId } = useParams();
  const { user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { showLoader, hideLoader, loading } = useUI();
  const [branchData, setBranchData] = useState(null);

  const effectiveBranchId = branchId || user?.branch_id || user?.branch;
  const isAdmin = ['clinic_admin', 'branch_admin'].includes(user?.role);

  useEffect(() => {
    const fetchScheduleOnly = async () => {
      if (!effectiveBranchId) return;
      
      showLoader();
      try {
        const res = await authFetch(`${API_URL}/api/clinic/general/branch-settings/branch-schedule/get-branch-schedule.php?branch_id=${effectiveBranchId}`);

        if(res?.success) {
          setBranchData(res.data); 
        }
      } catch (err) {
        console.error("Schedule Fetch Error:", err);
      } finally {
        hideLoader();
      }
    };

    fetchScheduleOnly();
  }, [effectiveBranchId]);


  if (loading || !branchData) {
    return null; 
  }

  // check maintenance
  const isMaintenance = Number(branchData?.is_maintenance) === 1;
  const showBlock = isMaintenance && !isAdmin;
  
  if(showBlock) {
    return <Maintenance onRefresh={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarOpen ? 256 : 64 }} 
        transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
        className="flex flex-col min-h-screen"
      >
        <Outlet context={{ branchData }} />
      </motion.main>
    </div>
  );
}