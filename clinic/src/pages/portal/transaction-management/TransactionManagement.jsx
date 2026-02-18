import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
// hooks
import { useUI } from '../../../hooks/useUI'; 
import { useUser } from '../../../hooks/useUser';
// utils
import { authFetch } from '../../../utils/authFetch';
// components
import Header from '../../../components/Header';
// view
import ClinicAdminView from './views/ClinicAdminView';
import StaffView from './views/StaffView';

const API_URL = import.meta.env.VITE_API_URL;

export default function TransactionManagement() {
  const { branchId: urlBranchId } = useParams();
  const { showLoader, hideLoader, loading } = useUI(); 
  const { user, loading: userLoading } = useUser();
  const [transactions, setTransactions] = useState([]); 
  const [summary, setSummary] = useState(null);
  const [branches, setBranches] = useState([]);

  const isClinicAdmin = user?.role === 'clinic_admin';
  const [currentBranch, setCurrentBranch] = useState(urlBranchId || 'all');
  const lastUrlBranch = useRef(urlBranchId);

  const fetchAll = useCallback(async (isManualRefresh = false) => {
    if (!currentBranch) return;

    if (isManualRefresh) showLoader('Refreshing Transactions...'); 
    
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
      hideLoader(); 
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

  const isAdmin = isClinicAdmin;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <section className="w-full px-6 my-6 container-xl">
        {isAdmin ? (
          <ClinicAdminView 
            transactions={transactions} 
            summary={summary}
            loading={loading}
            onRefresh={() => fetchAll(true)}
            branches={branches}
            currentBranch={currentBranch}
            setCurrentBranch={setCurrentBranch} 
            user={user}
            isClinicAdmin={isClinicAdmin}
          />
        ) : (
          <StaffView 
            transactions={transactions} 
            summary={summary}
            loading={loading}
            onRefresh={() => fetchAll(true)}
            user={user}
            branchId={urlBranchId}
          />
        )}
      </section>
    </div>
  );
}