import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
// hooks
import { useUI } from '../../../hooks/useUI'; 
import { useUser } from '../../../hooks/useUser';
// utils
import { authFetch } from '../../../utils/authFetch';
// components
import Header from '../../../components/Header';
import LoaderV2 from '../../../components/LoaderV2';
import PendingAppointmentModal from './components/PendingAppointmentModal';

// Specialized Views
import AdminView from './views/AdminView';
import StaffView from './views/StaffView';


export default function AppointmentManagement() {
  const { branchId } = useParams();
  const { loading } = useUI(); 
  const { fetchBranchData } = useOutletContext();
  const { user, loading: userLoading } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const fetchAll = useCallback(async (refreshBranch = false) => {
    setIsLoading(true);
    
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
      setIsLoading(false); 
    }
  }, [branchId]); 

  useEffect(() => { 
    if(branchId && !userLoading) {
      fetchAll(false); 
    }
  }, [branchId, fetchAll]);
  

  // check if admin
  const isEagleEyeRole = ['branch_admin', 'clinic_admin', 'staff'].includes(user?.role);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      
      <section className="w-full px-6 my-6 container-xl">
        {isLoading && appointments.length === 0 ? (
          <LoaderV2 />
        ) : isEagleEyeRole ? (
          <AdminView 
            appointments={appointments} 
            loading={isLoading}
            onSelect={setSelectedAppointment} 
            user={user}
            onRefresh={fetchAll}
            branchId={branchId} 
          />
        ) : (
          <StaffView 
            appointments={appointments} 
            loading={isLoading} 
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