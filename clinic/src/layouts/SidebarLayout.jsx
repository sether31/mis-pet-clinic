import { useState, useEffect, useCallback } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
// hooks
import { useUser } from '../hooks/useUser';
// utils
import { authFetch } from '../utils/authFetch';
// components
import Sidebar from '../components/Sidebar';
import LoaderV2 from '../components/LoaderV2';
// pages
import Maintenance from '../pages/portal/Maintenance';

const API_URL = import.meta.env.VITE_API_URL;

export default function SidebarLayout() {
  const { branchId } = useParams();
  const { user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [branchData, setBranchData] = useState(null);

  const effectiveBranchId = branchId || user?.branch_id || user?.branch;
  const isAdmin = ['clinic_admin', 'branch_admin'].includes(user?.role);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchBranchData = useCallback(async (silent = false) => {
    if (!effectiveBranchId) return;
    
    if (!silent) setIsLoading(true); 
    
    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/branch-settings/branch-schedule/get-branch-schedule.php?branch_id=${effectiveBranchId}`);

      if(res?.success) {
        setBranchData(res.data); 
      }
    } catch (err) {
      console.error("Schedule Fetch Error:", err);
    } finally {
      if (!silent) setIsLoading(false); 
    }
  }, [effectiveBranchId]);

  useEffect(() => {
    fetchBranchData();
  }, [fetchBranchData]);

  // Handle Maintenance check strictly after loading finishes
  if (!isLoading && branchData) {
    const isMaintenance = Number(branchData?.is_maintenance) === 1;
    const showBlock = isMaintenance && !isAdmin;
    
    if(showBlock) {
      return <Maintenance onRefresh={() => window.location.reload()} />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <motion.main
        initial={false}
        animate={{ 
          marginLeft: isMobile ? 0 : (sidebarOpen ? 256 : 72),
          width: isMobile ? '100%' : `calc(100% - ${sidebarOpen ? 256 : 72}px)`
        }}
        transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
        className="flex flex-col min-h-screen"
      >
        {isLoading || !branchData ? (
          null
        ) : (
          <Outlet context={{ branchData, fetchBranchData }} />
        )}
      </motion.main>
    </div>
  );
}