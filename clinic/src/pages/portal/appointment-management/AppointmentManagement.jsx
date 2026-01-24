import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
// hooks
import { useUI } from '../../../hooks/useUI'; 
// utils
import { authFetch } from '../../../utils/authFetch';
// components
import Header from '../../../components/Header';
// sub components
import PendingAppointmentModal from './PendingAppointmentModal';
import PendingAppointments from './PendingAppointments';

export default function AppointmentManagement() {
  const { branchId } = useParams();
  const { showLoader, hideLoader, loading } = useUI(); 
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const fetchAll = useCallback(async () => {
    showLoader('Fetching Inbox...'); 
    try {
      const res = await authFetch(`${import.meta.env.VITE_API_URL}/api/clinic/general/appointment/get-appointments.php?branch_id=${branchId}`);
      if (res.success) setAppointments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      hideLoader();
    }
  }, [branchId]); 

  useEffect(() => { 
    fetchAll(); 
  }, [branchId]); 

  const pendingOnly = appointments.filter(a => a.status === 'pending');

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <section className="w-full px-6 my-6 container-xl">
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Booking Management</h1>
            <p className="text-gray-500">Review and manage incoming booking requests</p>
          </div>
        </div>

        <div className='grid gap-4 grid-cols-[.5fr_1.5fr]'>     
          <PendingAppointments 
            pendingAppointment={pendingOnly} 
            loading={loading} 
            onSelect={setSelectedAppointment}
          />

          <main className="p-12 border border-gray-300 rounded-lg">
            
          </main>
        </div>
      </section>

      {selectedAppointment && (
        <PendingAppointmentModal 
          selectedAppointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onRefresh={fetchAll}
        />
      )}
    </div>
  );
}