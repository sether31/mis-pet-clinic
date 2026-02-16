import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { HiXCircle, HiClock, HiExclamationCircle, HiCheckCircle, HiBan } from 'react-icons/hi';
import { authFetch } from '../../../../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL;

export default function CreateAppointmentModalAdmin({ branchId, staffList, onClose, onRefresh }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [services, setServices] = useState([]);
  const [busySlots, setBusySlots] = useState([]); 
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    user_id: '', 
    pet_id: '', 
    service_id: '', 
    staff_id: '', 
    appointment_date: '', 
    start_time: ''
  });

  const format12Hour = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  const addMinutes = (timeStr, mins) => {
    if (!timeStr || !mins) return timeStr;
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + parseInt(mins), 0);
    return date.toTimeString().slice(0, 5);
  };

  // border
  const getBorderClass = (field, hasError) => {
    if (hasError) return 'border-red-500';
    if (formData[field]) return 'border-green-500';
    return 'border-gray-200 bg-gray-50';
  };

  // fetch branch service
  useEffect(() => {
    const fetchServices = async () => {
      const res = await authFetch(`${API_URL}/api/clinic/general/services/get-branch-services.php?branch_id=${branchId}`);
      if(res.success) setServices(res.data.filter(s => Number(s.status) === 1));
    };
    fetchServices();
  }, [branchId]);

  useEffect(() => {
    const fetchBusySlots = async () => {
      if (!formData.staff_id || !formData.appointment_date) {
        setBusySlots([]);
        return;
      }
      try {
        const res = await authFetch(`${API_URL}/api/clinic/general/appointment/get-staff-appointments.php?staff_id=${formData.staff_id}&date=${formData.appointment_date}`);
        if(res.success) setBusySlots(res.data);
      } catch (err) { console.error("Busy fetch error:", err); }
    };
    fetchBusySlots();
  }, [formData.staff_id, formData.appointment_date]);

  // memoized
  const selectedService = useMemo(() => 
    services.find(s => String(s.branch_service_id) === String(formData.service_id)), 
  [formData.service_id, services]);

  const calculatedEndTime = useMemo(() => {
    if (!formData.start_time || !selectedService?.duration) return '';
    return addMinutes(formData.start_time, selectedService.duration);
  }, [formData.start_time, selectedService]);

  const filteredStaffList = useMemo(() => {
    if (!selectedService || !selectedService.assigned_role) return staffList;
    return staffList.filter(staff => 
      String(staff.role_name || "").toLowerCase() === String(selectedService.assigned_role).toLowerCase()
    );
  }, [selectedService, staffList]);

  const workingHours = useMemo(() => {
    const staff = staffList.find(s => String(s.staff_id) === String(formData.staff_id));
    if (!staff || !formData.appointment_date) return null;
    const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(formData.appointment_date).getDay()];
    return staff.schedule?.[day]?.is_workday ? staff.schedule[day] : null;
  }, [formData.staff_id, formData.appointment_date, staffList]);

  // validation
  useEffect(() => {
    const errs = {};
    const { start_time, appointment_date } = formData;

    if(appointment_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(appointment_date) < today) errs.date = "Cannot book in the past";
    }

    if(workingHours && start_time && calculatedEndTime) {
      if(start_time < workingHours.start || calculatedEndTime > workingHours.end) {
        errs.shift = `Time is outside shift (${format12Hour(workingHours.start)} - ${format12Hour(workingHours.end)})`;
      }
    }

    if (start_time && calculatedEndTime) {
      const conflict = busySlots.find(slot => (start_time < slot.end && calculatedEndTime > slot.start));
      if (conflict) errs.conflict = `Conflict: Staff busy ${format12Hour(conflict.start)} - ${format12Hour(conflict.end)}`;
    }
    setErrors(errs);
  }, [formData, busySlots, workingHours, calculatedEndTime]);

  // handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (Object.keys(errors).length > 0) return toast.error(Object.values(errors)[0]);

    setIsSubmitting(true);
    try {
      const response = await authFetch(`${API_URL}/api/clinic/general/appointment/create-appointment.php`, {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          end_time_calc: calculatedEndTime,
          start_time: `${formData.appointment_date} ${formData.start_time}:00`,
          end_time: `${formData.appointment_date} ${calculatedEndTime}:00`,
          branch_id: branchId
        })
      });

      if(response && response.success) {
        toast.success("Appointment Created!");
        if (onRefresh) onRefresh();
        onClose(); 
      } else {
        toast.error(response?.message || "Failed to create appointment.");
      }
    } catch(err) { 
      toast.error("Something went wrong"); 
    } finally { 
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-110 bg-black/60 backdrop-blur-sm">
      <div 
        className="flex flex-col w-full max-w-lg overflow-hidden bg-white rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">Create Appointment</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest">Manual booking appointment and staff assignment</p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-all cursor-pointer hover:text-red-500">
            <HiXCircle size={32}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto max-h-[85vh]">
          {/* service */}
          <div className="space-y-1">
            <label className="mb-1 ml-1 text-sm font-bold text-gray-700">
              1. Choose Service <span className="text-red-500">*</span>
            </label>
            <select 
              className={`w-full p-3 border rounded-xl transition-all focus:ring outline-none text-sm ${getBorderClass('service_id', false)}`} 
              value={formData.service_id} 
              onChange={e => setFormData({...formData, service_id: e.target.value, staff_id: ''})} 
              required
            >
              <option value="">Select Service...</option>
              {services.map(s => (
                <option key={s.branch_service_id} value={s.branch_service_id}>
                  {s.custom_name?.replace(/_/g, ' ')} ({s.duration} mins)
                </option>
              ))}
            </select>
          </div>

          <div className={`space-y-4 transition-opacity duration-300 ${!formData.service_id ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            <div className="grid grid-cols-2 gap-4">
              {/* staff*/}
              <div className="space-y-1">
                <label className="mb-1 ml-1 text-sm font-bold text-gray-700">
                  2. Assign Staff <span className="text-red-500">*</span>
                </label>
                <select 
                  className={`w-full p-3 border rounded-xl transition-all text-sm ${getBorderClass('staff_id', false)}`} 
                  value={formData.staff_id} 
                  onChange={e => setFormData({...formData, staff_id: e.target.value})} 
                  required
                >
                  <option value="">Select Staff</option>
                  {filteredStaffList.map(s => <option key={s.staff_id} value={s.staff_id}>{s.fname} {s.lname}</option>)}
                </select>
              </div>
              {/* date */}
              <div className="space-y-1">
                <label className="mb-1 ml-1 text-sm font-bold text-gray-700">
                  3. Select Date <span className="text-red-500">*</span>
                </label>
                <input 
                  type="date" 
                  className={`w-full p-3 border rounded-xl transition-all ${getBorderClass('appointment_date', !!errors.date)}`} 
                  value={formData.appointment_date} 
                  onChange={e => setFormData({...formData, appointment_date: e.target.value})} 
                  required 
                />
              </div>
            </div>

            {/* Shift Availability UI */}
            {formData.staff_id && formData.appointment_date && (
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${workingHours ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div>
                  <p className={`text-[10px] font-black uppercase ${workingHours ? 'text-green-700' : 'text-red-600'}`}>
                    Shift Availability
                  </p>
                  <p className={`text-[14px] font-bold ${workingHours ? 'text-green-900' : 'text-red-900'}`}>
                    {workingHours 
                      ? `${format12Hour(workingHours.start)} - ${format12Hour(workingHours.end)}` 
                      : 'OFF DUTY - Staff not working today'}
                  </p>
                </div>
                {workingHours ? <HiCheckCircle size={24} className="text-green-500"/> : <HiBan size={24} className="text-red-500"/>}
              </div>
            )}

            <div className="grid items-end grid-cols-2 gap-4">
              {/* start time */}
              <div className="space-y-1">
                <label className="mb-1 ml-1 text-sm font-bold text-gray-700">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input 
                  type="time" 
                  className={`w-full p-3 border rounded-xl transition-all text-sm ${getBorderClass('start_time', !!(errors.conflict || errors.shift))}`} 
                  value={formData.start_time} 
                  onChange={e => setFormData({...formData, start_time: e.target.value})} 
                  required 
                />
              </div>
              {/* end time */}
              <div className="space-y-1">
                <label className="mb-1 ml-1 text-sm font-bold text-gray-700">
                  End Time (Auto)
                </label>
                <div className="flex items-center gap-2 p-3 text-gray-600 border border-gray-300 border-dashed bg-gray-50 rounded-xl">
                  <HiClock className="text-gray-400"/>
                  <span className="text-sm italic">
                    {calculatedEndTime ? format12Hour(calculatedEndTime) : '--:--'}
                  </span>
                </div>
              </div>
            </div>

            {/* error messages */}
            {(errors.conflict || errors.shift || errors.date) && (
              <p className="text-[11px] text-red-600 font-bold uppercase flex items-center gap-2 bg-red-50 p-3 rounded-xl border border-red-200">
                <HiExclamationCircle size={18}/> {errors.conflict || errors.shift || errors.date}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              {/* user id */}
              <div className="space-y-1">
                <label className="mb-1 ml-1 text-sm font-bold text-gray-700">
                  User ID <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  placeholder="Enter User ID" 
                  className={`w-full p-3 border rounded-xl transition-all text-sm ${getBorderClass('user_id', false)}`} 
                  value={formData.user_id} 
                  onChange={e => setFormData({...formData, user_id: e.target.value})} 
                  required 
                />
              </div>
              {/* pet id*/}
              <div className="space-y-1">
                <label className="mb-1 ml-1 text-sm font-bold text-gray-700">
                  Pet ID <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  placeholder="Enter Pet ID" 
                  className={`w-full p-3 border rounded-xl transition-all text-sm ${getBorderClass('pet_id', false)}`} 
                  value={formData.pet_id} 
                  onChange={e => setFormData({...formData, pet_id: e.target.value})} 
                  required 
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={
              isSubmitting || 
              !formData.start_time || 
              !formData.user_id ||
              !formData.pet_id || 
              Object.keys(errors).length > 0 || 
              !workingHours
            }
            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-xs ${
              isSubmitting || 
              Object.keys(errors).length > 0 || 
              !workingHours || 
              !formData.start_time ||
              !formData.user_id || 
              !formData.pet_id     
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-(--clr-primary) text-white hover:brightness-110 active:scale-95 shadow-lg shadow-blue-100'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 rounded-full border-white/30 border-t-white animate-spin" />
                Processing...
              </>
            ) : "+ Confirm Appointment"}
          </button>
        </form>
      </div>
    </div>
  );
}