import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
// hooks
import { useUI } from '../../../hooks/useUI'; 
import { useUser } from '../../../hooks/useUser';
// utils
import { authFetch } from '../../../utils/authFetch';
// components
import Header from '../../../components/Header';
import LoaderV2 from '../../../components/LoaderV2'; 
// view
import ClinicAdminView from './views/ClinicAdminView';
import StaffView from './views/StaffView';

const API_URL = import.meta.env.VITE_API_URL;

export default function TransactionManagement() {
  const { branchId: urlBranchId } = useParams();
  const { showLoader, hideLoader, loading } = useUI(); 
  const { user, loading: userLoading } = useUser();
  
  const [isLoading, setIsLoading] = useState(true);
  
  const [transactions, setTransactions] = useState([]); 
  const [summary, setSummary] = useState(null);
  const [branches, setBranches] = useState([]);

  const isClinicAdmin = user?.role === 'clinic_admin';
  const [currentBranch, setCurrentBranch] = useState(urlBranchId || (isClinicAdmin ? 'all' : urlBranchId));
  const lastUrlBranch = useRef(urlBranchId);

  const fetchAll = useCallback(async (isManualRefresh = false) => {
    if (!currentBranch) return;

    if(isManualRefresh) {
      showLoader('Refreshing Transactions...'); 
    } else {
      setIsLoading(true);
    }
    
    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/billing/get-transactions.php?branch_id=${currentBranch}`);
      
      if(res.success) {
        setTransactions(res.data); 
        setSummary(res.summary); 
        if(res.branches && isClinicAdmin) setBranches(res.branches);
      }
    } catch(err) { 
      console.error("Fetch Error:", err); 
    } finally { 
      if(isManualRefresh) {
        hideLoader();
      } else {
        setIsLoading(false);
      }
    }
  }, [currentBranch, isClinicAdmin, showLoader, hideLoader]); 

  useEffect(() => { 
    if(!userLoading) {
      fetchAll(false); 
    }
  }, [currentBranch, userLoading, fetchAll]);

  useEffect(() => {
    if(urlBranchId !== lastUrlBranch.current) {
      setCurrentBranch(urlBranchId || 'all');
      lastUrlBranch.current = urlBranchId;
    }
  }, [urlBranchId]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      
      <section className="flex-1 w-full px-6 my-6 container-xl">  
        {isLoading ? (
          <LoaderV2 />
        ) : isClinicAdmin ? (
          <ClinicAdminView 
            transactions={transactions} 
            summary={summary}
            loading={loading}
            onRefresh={() => fetchAll(true)}
            branches={branches}
            currentBranch={currentBranch}
            setCurrentBranch={setCurrentBranch} 
            isClinicAdmin={isClinicAdmin}
          />
        ) : (
          <StaffView 
            transactions={transactions} 
            summary={summary}
            loading={loading}
            onRefresh={() => fetchAll(true)}
          />
        )}
      </section>
    </div>
  );
}