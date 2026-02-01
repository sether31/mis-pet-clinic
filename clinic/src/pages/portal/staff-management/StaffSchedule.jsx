import { useState } from 'react';
// image
import noImage from '../../../assets/images/no-image.jpg'; 
// icons
import { CiSearch, CiCalendar } from 'react-icons/ci';
import { HiExclamationTriangle } from 'react-icons/hi2';

const API_URL = import.meta.env.VITE_API_URL;

export default function StaffSchedule({ staffData, branchSchedule = [], searchTerm, onSearch }) {
  const [activeTab, setActiveTab] = useState('active');

  // convert 24 to 12
  const format12h = (timeStr) => {
    if (!timeStr || timeStr === "00:00") return 'N/A';
    let [hours, minutes] = timeStr.split(':');
    hours = parseInt(hours);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; 
    return `${hours}:${minutes} ${ampm}`;
  };

  // convert to mins
  const toMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hrs, mins] = timeStr.split(':').map(Number);
    return hrs * 60 + mins;
  };

  const getScheduleArray = (schedule) => {
    if(!schedule) return [];
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return days.map(day => ({
      day,
      available: schedule[day]?.is_workday || false,
      start: schedule[day]?.start || "00:00",
      end: schedule[day]?.end || "00:00"
    }));
  };

  const checkConflict = (staffDay) => {
    if(!staffDay.available || !branchSchedule.length) return null;

    const branchDay = branchSchedule.find(b => 
      b.day_of_week.toLowerCase() === staffDay.day.toLowerCase()
    );

    if(!branchDay) return null;
    if(Number(branchDay.is_closed) === 1) return "Branch is Closed";

    const sStart = toMinutes(staffDay.start);
    const sEnd = toMinutes(staffDay.end);
    const bStart = toMinutes(branchDay.start_time);
    const bEnd = toMinutes(branchDay.end_time);

    if(sStart < bStart || sEnd > bEnd) {
      return `Outside Branch Hours: ${format12h(branchDay.start_time)} - ${format12h(branchDay.end_time)}`
    }

    return null;
  };

  const filteredStaff = staffData.filter(staff => {
    const isStatusMatch = activeTab === 'active' ? Number(staff.status) === 1 : Number(staff.status) === 0;
    const fullName = `${staff.fname} ${staff.lname}`.toLowerCase();
    const role = (staff.role_name || '').toLowerCase();
    return isStatusMatch && (fullName.includes(searchTerm.toLowerCase()) || role.includes(searchTerm.toLowerCase()));
  });

  return (
    <div>
      {/* tabs */}
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex p-1 bg-gray-100 rounded-xl w-fit">
          <button onClick={() => setActiveTab('active')} className={`cursor-pointer px-6 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'active' ? 'bg-(--clr-primary) text-white' : 'text-gray-400'}`}>Active</button>
          <button onClick={() => setActiveTab('inactive')} className={`cursor-pointer px-6 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'inactive' ? 'bg-(--clr-primary) text-white' : 'text-gray-400'}`}>Inactive</button>
        </div>
        <div className="relative w-full max-w-xs">
          <input type="text" placeholder="Search staff..." className="w-full p-2.5 pl-9 bg-white border border-gray-200 rounded-xl outline-none focus:ring focus:ring-(--clr-primary) text-sm" value={searchTerm} onChange={(e) => onSearch(e.target.value)} />
          <CiSearch className="absolute text-gray-400 left-3 top-3" size={18} />
        </div>
      </div>

      {/* card */}
      <div className="grid grid-cols-1 gap-6 mt-8 md:grid-cols-2 lg:grid-cols-3">
        {filteredStaff.length > 0 ? (
          filteredStaff.map((staff) => {
            const scheduleItems = getScheduleArray(staff.schedule);
            return (
              // header
              <div key={staff.user_id} className="flex flex-col overflow-hidden bg-white border border-gray-200 rounded-2xl">
                <div className="flex items-center gap-4 p-5 border-b bg-gray-50/30">
                  <img 
                    src={staff.profile_pic ? `${API_URL}/${staff.profile_pic}` : noImage}
                    alt="profile"
                    className="object-cover w-12 h-12 border-2 border-white rounded-2xl"
                    onError={(e) => { e.target.src = noImage; }}
                  />
                  <div>
                    <h3 className="font-bold leading-tight text-gray-800">{staff.fname} {staff.lname}</h3>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                      {staff.role_name?.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="p-4 space-y-1.5">
                  {scheduleItems.map((day, idx) => {
                    const conflict = checkConflict(day);
                    return (
                      <div key={idx} className={`flex justify-between items-start py-2.5 px-3 rounded-xl border transition-all ${
                        conflict 
                          ? 'bg-red-50 border-red-200 ring-1 ring-red-100' 
                          : day.available ? 'bg-gray-50/50 border-transparent' : 'bg-transparent border-transparent'
                      }`}>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-gray-400 uppercase w-8">{day.day.slice(0,3)}</span>
                          {conflict && <HiExclamationTriangle className="text-red-500" size={14} />}
                        </div>
                        
                        <div className="text-right">
                          <p className={`text-[11px] font-black ${
                            conflict ? 'text-red-700' : day.available ? 'text-gray-800' : 'text-gray-300 italic'
                          }`}>
                            {day.available ? `${format12h(day.start)} - ${format12h(day.end)}` : 'DAY OFF'}
                          </p>
                          {conflict && (
                            <p className="text-[9px] font-bold text-red-500 mt-0.5 leading-tight">
                              {conflict}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          // no found
          <div className="py-24 text-center bg-white border border-gray-200 border-dashed col-span-full rounded-3xl">
            <div className="flex flex-col items-center max-w-xs mx-auto">
              <div className="p-4 rounded-full bg-gray-50">
                 <CiSearch className="text-gray-300" size={40} />
              </div>
              <h3 className="font-bold text-gray-800">No {activeTab} staff found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                   ? `We couldn't find any results for "${searchTerm}" in the ${activeTab} list.` 
                   : `There are currently no staff members marked as ${activeTab}.`}
              </p>
              {searchTerm && (
                <button 
                  onClick={() => onSearch('')}
                  className="mt-4 text-sm font-bold text-(--clr-primary) hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}