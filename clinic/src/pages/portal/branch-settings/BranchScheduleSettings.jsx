import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../../hooks/useUI';
// utils
import { authFetch } from '../../../utils/authFetch';
// icons 
import { 
  HiOutlineClock, 
  HiOutlineInformationCircle, 
  HiOutlineWrenchScrewdriver,
} from "react-icons/hi2";
import { HiSave } from 'react-icons/hi';

const API_URL = import.meta.env.VITE_API_URL;

export default function ScheduleSettings() {
  const { branchId } = useParams();
  const { showLoader, hideLoader, loading } = useUI();
  const [schedule, setSchedule] = useState([]);
  const [isMaintenance, setIsMaintenance] = useState(false);

  // get branch sched data
  useEffect(() => {
    const fetchSchedule = async () => {
      showLoader("Fetching settings...");
      try {
        const res = await authFetch(`${API_URL}/api/clinic/general/branch-settings/branch-schedule/get-branch-schedule.php?branch_id=${branchId}`);
        if(res.success) {
          setSchedule(res.data.schedules || res.data);
          setIsMaintenance(parseInt(res.data.is_maintenance) === 1);
        } else {
          toast.error("Failed to load schedule.");
        }
      } catch(error) {
        toast.error("Something went wrong.");
      } finally {
        hideLoader();
      }
    };
    fetchSchedule();
  }, [branchId]);

  const handleTimeChange = (index, field, value) => {
    const updatedSchedule = [...schedule];
    updatedSchedule[index][field] = value;
    setSchedule(updatedSchedule);
  };

  const handleToggleClosed = (index) => {
    const updatedSchedule = [...schedule];
    updatedSchedule[index].is_closed = Number(updatedSchedule[index].is_closed) === 1 ? 0 : 1;
    setSchedule(updatedSchedule);
  };

  const handleSave = async () => {
    showLoader("Saving changes...");
    try {
      const formData = new FormData();
      formData.append('branch_id', branchId);
      formData.append('schedules', JSON.stringify(schedule));
      formData.append('is_maintenance', isMaintenance ? 1 : 0);

      const res = await authFetch(`${API_URL}/api/clinic/general/branch-settings/branch-schedule/update-branch-schedule.php`, {
        method: 'POST',
        body: formData
      });

      if(res.success) {
        toast.success("Branch settings updated successfully!");
      } else {
        toast.error("Failed to update settings.");
      }
    } catch(error) {
      toast.error("Something went wrong.");
    } finally {
      hideLoader();
    }
  };

  if (loading && schedule.length === 0) return null;

  return (
    <div>   
      {/* maintenance */}
      <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between transition-all ${isMaintenance ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isMaintenance ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
            <HiOutlineWrenchScrewdriver size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold">Maintenance Mode</h3>
            <p className="text-[10px] text-gray-500 font-medium">Temporarily disable client bookings without changing your schedule.</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={isMaintenance} 
            onChange={() => setIsMaintenance(!isMaintenance)} 
          />
          <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
        </label>
      </div>

      {/* header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <HiOutlineClock className="text-(--clr-primary)" />
          Branch Operating Hours
        </h2>
        <p className="text-xs text-gray-500 mt-1">Set your branch availability to enable online bookings.</p>
      </div>

      {/* warning info */}
      <div className="mb-6 flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
        <HiOutlineInformationCircle size={20} className="shrink-0 text-blue-500" />
        <p className="text-xs leading-5">
          Only days set to <span className="font-bold">Open</span> will be visible to clients. Ensure your start and end times are accurate to avoid booking conflicts.
        </p>
      </div>

      {/* schedule table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <div className="min-w-[650px]">
            <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <div className="col-span-3">Day of Week</div>
              <div className="col-span-6 text-center">Operating Hours</div>
              <div className="col-span-3 text-right">Status</div>
            </div>

            <div className="divide-y divide-gray-100">
              {schedule.map((day, idx) => {
                const isClosed = Number(day.is_closed) === 1;
                return (
                  <div key={day.day_of_week} className={`grid grid-cols-12 items-center px-6 py-3.5 transition-all ${isClosed ? 'bg-gray-50/50' : 'bg-white'}`}>
                    <div className="col-span-3">
                      <span className={`text-sm font-bold ${isClosed ? 'text-gray-300' : 'text-gray-700'}`}>
                        {day.day_of_week}
                      </span>
                    </div>

                    <div className={`col-span-6 flex items-center justify-center gap-3 transition-all ${isClosed ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                      <input 
                        type="time" 
                        value={day.start_time || ''} 
                        onChange={(e) => handleTimeChange(idx, 'start_time', e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-900 focus:border-(--clr-primary) outline-none"
                      />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">to</span>
                      <input 
                        type="time" 
                        value={day.end_time || ''} 
                        onChange={(e) => handleTimeChange(idx, 'end_time', e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-900 focus:border-(--clr-primary) outline-none"
                      />
                    </div>

                    <div className="col-span-3 flex justify-end">
                      <label className="relative inline-flex items-center cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={!isClosed} 
                          onChange={() => handleToggleClosed(idx)}
                        />
                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-(--clr-primary)"></div>
                        <span className={`ms-3 text-[10px] font-black uppercase tracking-wider transition-colors ${isClosed ? 'text-gray-300' : 'text-(--clr-primary)'}`}>
                          {isClosed ? 'Closed' : 'Open'}
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* save btn */}
      <div className="mt-8 flex justify-end">
        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full md:w-auto px-10 py-3 bg-(--clr-primary) text-white rounded-xl font-bold active:scale-95 disabled:opacity-50 transition-all text-sm cursor-pointer flex items-center justify-center gap-2"
        >
          <HiSave size={18} />
          Save Schedule Changes
        </button>
      </div>
    </div>
  );
}