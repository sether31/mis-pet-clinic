import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { HiRefresh } from 'react-icons/hi';
import { IoLockClosedOutline } from "react-icons/io5";
import PendingAppointments from '../components/PendingAppointments';
import CalendarComponent from '../components/CalendarComponent';
import AppointmentPaymentModal from '../components/AppointmentPaymentModal';

export default function StaffView({ appointments, loading, onSelect, user, onRefresh, branchId }) {
  const { branchData } = useOutletContext();
  const [activeTask, setActiveTask] = useState(null);

  const branchSchedules = branchData?.schedules || [];

  const masterRange = useMemo(() => {
    if (branchSchedules.length === 0) return { min: "08:00:00", max: "20:00:00" };
    
    // extract all start and end and sort them
    const allStarts = branchSchedules.map(s => s.start_time).sort();
    const allEnds = branchSchedules.map(s => s.end_time).sort();
    
    // get the min and max of schedule
    return {
      min: allStarts[0],
      max: allEnds[allEnds.length - 1] 
    };
  }, [branchSchedules]);

  const effectiveBranchId = branchId || user?.branch_id || user?.branch;

  const pendingOnly = useMemo(() => 
    appointments.filter(a => a.status === 'pending'), 
  [appointments]);

  // get appointments
  const mySchedule = useMemo(() => appointments.filter(a => 
    ['confirmed', 'completed', 'billed'].includes(a.status) && (a.assigned_to ? String(a.assigned_to) === String(user?.id) : true)
  ), [appointments, user?.id]);

  const getTodayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());

  // check if today is close
  const isTodayClosed = useMemo(() => {
    const todayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
    const todaySchedule = branchSchedules.find(s => s.day_of_week === todayName);
    return todaySchedule ? Number(todaySchedule.is_closed) === 1 : true;
  }, [branchSchedules]);

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[550px] gap-6">
      <div className="flex-none w-full h-full lg:w-96">
        <PendingAppointments 
          pendingAppointment={pendingOnly} 
          loading={loading} 
          onSelect={onSelect} 
        />
      </div>

      <main className="relative flex-1 p-6 overflow-hidden bg-white border border-gray-300 rounded-xl">
        {/* branch close */}
        {isTodayClosed ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 duration-500 border border-gray-300 bg-gray-50 rounded-xl">
            <div className="p-6 text-blue-600 bg-blue-100 rounded-full">
              <IoLockClosedOutline size={48} />
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-black tracking-tight text-gray-800 uppercase">
                Branch is Closed
              </h2>
              <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1 max-w-[250px] mx-auto">
                No operating hours scheduled for {getTodayName}.
                You can still manage pending requests for other days.
              </p>
            </div>

            <button 
              onClick={onRefresh}
              className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-300 rounded-full text-[10px] font-black uppercase hover:bg-gray-100 transition-all active:scale-95 cursor-pointer"
            >
              <HiRefresh /> 
              Check status
            </button>
          </div>
        ) : (
          // branch open
          <CalendarComponent 
            events={mySchedule} 
            viewMode="staff" 
            onEventClick={(task) => setActiveTask(task)} 
            fullSchedules={branchSchedules}
            openingTime={masterRange.min}
            closingTime={masterRange.max}
          />
        )}

        {/* appointment modal */}
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
  );
}