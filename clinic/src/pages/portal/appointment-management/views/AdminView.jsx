import { useMemo, useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
// utils
import { authFetch } from '../../../../utils/authFetch';
// components
import SubscriptionGate from '../../../../components/SubscriptionGate';
// sub components
import PendingAppointments from '../components/PendingAppointments';
import CalendarComponent from '../components/CalendarComponent';
import AppointmentPaymentModal from '../components/AppointmentPaymentModal'; 
import CreateAppointmentModalAdmin from '../components/CreateAppointmentModalAdmin';
// icons
import { HiRefresh } from 'react-icons/hi';


const API_URL = import.meta.env.VITE_API_URL;

export default function AdminView({ appointments, loading, onSelect, user, onRefresh, branchId }) {
  const { branchData } = useOutletContext();
  const [activeTask, setActiveTask] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('all');
  const branchSchedules = branchData?.schedules || [];
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        if(!branchId) return;
        const res = await authFetch(`${API_URL}/api/clinic/general/staff/get-staff-data.php?branch_id=${branchId}`);
        if(res.success) {
          const activePractitioners = res.data.filter(staff => {
            const isActive = Number(staff.status) === 1;
            const hasPermission = Array.isArray(staff.permissions) && 
                                  staff.permissions.includes('appointment_management');
            return isActive && hasPermission;
          });
          setStaffList(activePractitioners);
        }
      } catch (err) {
        console.error("Staff Fetch Error:", err);
      }
    };
    fetchStaff();
  }, [branchId]);

  // find sched for selected staff
  const selectedStaffSchedule = useMemo(() => {
    if (selectedStaffId === 'all') return null;
    const staff = staffList.find(s => String(s.staff_id) === String(selectedStaffId));
  
    return staff?.schedule || null; 
  }, [staffList, selectedStaffId]);

  // calculate branch schedule to calendar
  const masterRange = useMemo(() => {
    if (branchSchedules.length === 0) return { min: "08:00:00", max: "20:00:00" };
    const allStarts = branchSchedules.filter(s => !Number(s.is_closed)).map(s => s.start_time).sort();
    const allEnds = branchSchedules.filter(s => !Number(s.is_closed)).map(s => s.end_time).sort();
    return {
      min: allStarts[0] || "08:00:00",
      max: allEnds[allEnds.length - 1] || "20:00:00"
    };
  }, [branchSchedules]);

 // pending filter
  const pendingOnly = useMemo(() => {
    return appointments.filter(a => {
      if (a.status !== 'pending') return false;
      if (selectedStaffId === 'all') return true;

      const isAssignedToThisStaff = String(a.staff_id) === String(selectedStaffId);
      const isUnassigned = !a.staff_id || a.staff_id === "0" || a.staff_id === 0;

      return isAssignedToThisStaff || isUnassigned;
    });
  }, [appointments, selectedStaffId]);

  // calendar filter
  const filteredSchedule = useMemo(() => {
    return appointments.filter(a => {
      const isConfirmed = ['confirmed', 'completed', 'billed'].includes(a.status);
      if (!isConfirmed) return false;
      if (selectedStaffId === 'all') return true;

      return String(a.staff_id) === String(selectedStaffId);
    });
  }, [appointments, selectedStaffId]);

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-col items-center justify-between gap-4 mb-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointment Overview</h1>
          <p className="text-gray-500">Managing all staff appointments</p>
        </div>
        {/* filter */}
        <div className="flex flex-col gap-3 lg:flex-row md:items-end">
          <div className="flex flex-col items-center w-full gap-1 md:gap-3 md:flex-row md:w-auto">
            <label className="text-[10px] font-black text-gray-400 uppercase whitespace-nowrap">Filter Staff:</label>
            <select 
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full md:w-64 p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold focus:ring focus:ring-(--clr-primary) outline-none cursor-pointer"
            >
              <option value="all">ALL STAFF SCHEDULES</option>
              {staffList.map(staff => (
                <option key={staff.staff_id} value={staff.staff_id}>
                  {staff.fname} {staff.lname} ({(staff.role_name).replace(/_/g, ' ')})
                </option>
              ))}
            </select>
          </div>
          <SubscriptionGate type="appointment">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-(--clr-primary) text-white justify-center px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              + New Appointment
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

      {/* main content */}
      <div className="flex flex-col lg:flex-row h-full min-h-[550px] gap-6">
        {/* pending */}
        <div className="flex-none w-full h-full lg:w-96">
          <PendingAppointments 
            pendingAppointment={pendingOnly} 
            loading={loading} 
            onSelect={onSelect} 
          />
        </div>

        {/* calendar */}
        <main className="relative flex-1 p-6 overflow-hidden bg-white border border-gray-300 rounded-xl">
          <CalendarComponent 
            events={filteredSchedule} 
            viewMode="admin" 
            onEventClick={(task) => setActiveTask(task)} 
            fullSchedules={branchSchedules}
            staffSchedule={selectedStaffSchedule}
            openingTime={masterRange.min}
            closingTime={masterRange.max}
          />

          {activeTask && (
            <AppointmentPaymentModal 
              user={user}
              activeTask={activeTask}
              branchId={branchId}
              onClose={() => setActiveTask(null)}
              onRefresh={onRefresh}
            />
          )}

          {isCreateModalOpen && (
            <CreateAppointmentModalAdmin 
              key="manual-appointment-modal"
              branchId={branchId}
              staffList={staffList}
              onClose={() => setIsCreateModalOpen(false)}
              onRefresh={onRefresh}
            />
          )}
        </main>
      </div>
    </div>
  );
}