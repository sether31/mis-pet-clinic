import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
// hooks
import { useUI } from '../../../hooks/useUI'; 
import { useUser } from '../../../hooks/useUser';
// utils
import { authFetch } from '../../../utils/authFetch';
// components
import Header from '../../../components/Header';
import PendingAppointmentModal from './components/PendingAppointmentModal';

// Specialized Views
import AdminView from './views/AdminView';
import StaffView from './views/StaffView';

export default function AppointmentManagement() {
  const { branchId } = useParams();
  const { showLoader, hideLoader, loading } = useUI(); 
  const { fetchBranchData } = useOutletContext();
  const { user, loading: userLoading } = useUser();
  
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const fetchAll = useCallback(async (refreshBranch = false) => {
    showLoader('Syncing Schedule...'); 
    
    try {
      const res = await authFetch(`${import.meta.env.VITE_API_URL}/api/clinic/general/appointment/get-appointments.php?branch_id=${branchId}`);
      if(res.success) {
        setAppointments(res.data);
      }

      if(refreshBranch && fetchBranchData) {
        await fetchBranchData(true);
      }
    } catch(err) { 
      console.error("Fetch Error:", err); 
    } finally { 
      hideLoader(); 
    }
  }, [branchId]); 

  useEffect(() => { 
    if(branchId && !userLoading) {
      fetchAll(false); 
    }
  }, [branchId, fetchAll]);
  

  // check if admin
  const isAdmin = user?.role === 'branch_admin' || user?.role === 'clinic_admin';

  if (loading && appointments.length === 0) return <p>Loading...</p>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <section className="w-full px-6 my-6 container-xl">
        {/* admin */}
        {isAdmin ? (
          <AdminView 
            appointments={appointments} 
            loading={loading}
            onSelect={setSelectedAppointment} 
            user={user}
            onRefresh={fetchAll}
            branchId={branchId} 
          />
        ) : (
          // staff
          <StaffView 
            appointments={appointments} 
            loading={loading} 
            onSelect={setSelectedAppointment} 
            user={user} 
            onRefresh={fetchAll} 
            branchId={branchId}
          />
        )}
      </section>

      {/* pending appointment modal */}
      {selectedAppointment && (
        <PendingAppointmentModal 
          selectedAppointment={selectedAppointment}
          loading={loading} 
          onSelect={setSelectedAppointment} 
          user={user} 
          onRefresh={fetchAll} 
          onClose={() => setSelectedAppointment(null)}
          branchId={branchId}
        />
      )}
    </div>
  );
}