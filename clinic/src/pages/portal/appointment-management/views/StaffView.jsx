import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
// utils
import { authFetch } from '../../../../utils/authFetch';
// components
import SubscriptionGate from '../../../../components/SubscriptionGate';
// sub components
import PendingAppointments from '../components/PendingAppointments';
import CalendarComponent from '../components/CalendarComponent';
import AppointmentPaymentModal from '../components/AppointmentPaymentModal';
import CreateAppointmentModalStaff from '../components/CreateAppointmentModalStaff'; 
// icons
import { HiRefresh, HiPlus } from 'react-icons/hi';
import { IoLockClosedOutline } from "react-icons/io5";

export default function StaffView({ appointments, loading, onSelect, user, onRefresh, branchId }) {
  const { branchData } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTask, setActiveTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [staffSchedule, setStaffSchedule] = useState(null);
  const [fullStaffList, setFullStaffList] = useState([]); 
  const branchSchedules = branchData?.schedules || [];

  // trigger modal
  useEffect(() => {
    const viewId = searchParams.get('view');

    if (viewId && appointments.length > 0) {
      const target = appointments.find(a => 
        String(a.appointment_id) === String(viewId) || String(a.id) === String(viewId)
      );

      if (target) {
        if (target.status === 'pending') {
          // open the Pending Modal
          onSelect(target); 
        } else {
          // open the Payment Modal
          setActiveTask(target); 
        }
        
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, appointments, onSelect, setSearchParams]);
  

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        const res = await authFetch(`${import.meta.env.VITE_API_URL}/api/clinic/general/staff/get-staff-data.php?branch_id=${branchId}`);
        if(res.success) {
          setFullStaffList(res.data);
          const myData = res.data.find(s => String(s.user_id) === String(user?.id || user?.user_id));
          if(myData?.schedule) setStaffSchedule(myData.schedule);
        }
      } catch (err) {
        console.error("Error fetching staff data:", err);
      }
    };

    if(branchId && (user?.id || user?.user_id)) fetchStaffData();
  }, [branchId, user?.id, user?.user_id]);

  const masterRange = useMemo(() => {
    if (branchSchedules.length === 0) return { min: "08:00:00", max: "20:00:00" };
    const allStarts = branchSchedules.filter(s => !Number(s.is_closed)).map(s => s.start_time).sort();
    const allEnds = branchSchedules.filter(s => !Number(s.is_closed)).map(s => s.end_time).sort();
    return { 
      min: allStarts[0] || "08:00:00", 
      max: allEnds[allEnds.length - 1] || "20:00:00" 
    };
  }, [branchSchedules]);

  const effectiveBranchId = branchId || user?.branch_id || user?.branch;

  const pendingOnly = useMemo(() => 
    appointments.filter(a => a.status === 'pending'), 
  [appointments]);

  const mySchedule = useMemo(() => appointments.filter(a => 
    ['confirmed', 'completed', 'billed'].includes(a.status) && (a.assigned_to ? String(a.assigned_to) === String(user?.id || user?.user_id) : true)
  ), [appointments, user?.id, user?.user_id]);

  const getTodayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());

  const isTodayClosed = useMemo(() => {
    const todaySchedule = branchSchedules.find(s => s.day_of_week === getTodayName);
    return todaySchedule ? Number(todaySchedule.is_closed) === 1 : true;
  }, [branchSchedules, getTodayName]);

  return (
    <div className="space-y-4">
      {/* Header - Styled same as AdminView but without Filter */}
      <div className="flex flex-col items-center justify-between gap-4 mb-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointment Overview</h1>
          <p className="text-gray-500">Managing your scheduled appointments</p>
        </div>

        <div className="flex items-center gap-3">
          {/* create appointment */}
          <SubscriptionGate type="appointment">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-(--clr-primary) text-white px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 cursor-pointer hover:brightness-110 active:scale-95"
            >
              <HiPlus size={16}/> New Appointment
            </button>
          </SubscriptionGate>

          {/* refresh */}
          <button 
            onClick={() => onRefresh(true)}
            className="flex items-center justify-center p-2 text-gray-600 transition-all bg-gray-100 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-200"
            title="Refresh Calendar"
          >
            <HiRefresh size={20} className={loading ? 'animate-spin' : ''} /> 
          </button>
        </div>
      </div>
      
      {/* main */}
      <div className="flex flex-col lg:flex-row h-full min-h-[550px] gap-6">
        {/* pending appointment*/}
        <div className="flex-none w-full h-full lg:w-96">
          <PendingAppointments 
            pendingAppointment={pendingOnly} 
            loading={loading} 
            onSelect={onSelect} 
          />
        </div>

        {/* calendar */}
        <main className="relative flex-1 p-6 overflow-hidden bg-white border border-gray-300 rounded-xl">
          {isTodayClosed && (
            <div className="flex items-center gap-3 p-4 mb-4 border rounded-xl bg-amber-50 border-amber-100 text-amber-600">
              <IoLockClosedOutline size={20} className="shrink-0" />
              <div>
                <p className="text-xs font-black uppercase tracking-widest">Branch is Closed Today</p>
                <p className="text-[10px] font-medium">You can still view past or future schedules.</p>
              </div>
            </div>
          )}

          <CalendarComponent 
            events={mySchedule} 
            viewMode="staff" 
            onEventClick={(task) => setActiveTask(task)} 
            fullSchedules={branchSchedules}
            staffSchedule={staffSchedule}
            openingTime={masterRange.min}
            closingTime={masterRange.max}
          />

          {/* Modals */}
          {showCreateModal && (
            <CreateAppointmentModalStaff 
              branchId={effectiveBranchId}
              staffUser={user} 
              onClose={() => setShowCreateModal(false)}
              onRefresh={onRefresh}
            />
          )}

          {activeTask && (
            <AppointmentPaymentModal 
              user={user}
              activeTask={activeTask}
              branchId={effectiveBranchId}
              onClose={() => setActiveTask(null)}
              onRefresh={onRefresh}
            />
          )}
        </main>
      </div>
    </div>
  );
}