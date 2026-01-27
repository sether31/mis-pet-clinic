import { useState } from 'react';
// image
import noImage from '../../../assets/images/no-image.jpg'; 
// icons
import { CiSearch, CiCalendar } from 'react-icons/ci';

const API_URL = import.meta.env.VITE_API_URL;

export default function StaffSchedule({ staffData, searchTerm, onSearch }) {
  const [activeTab, setActiveTab] = useState('active');

  const getScheduleArray = (schedule) => {
    if (!schedule) return [];
    if (Array.isArray(schedule)) return schedule;
    return Object.entries(schedule).map(([day, details]) => ({
      day,
      available: details.is_workday || details.available,
      start: details.start || details.start_time,
      end: details.end || details.end_time
    }));
  };

  // filter
  const filteredStaff = staffData.filter(staff => {
    const isStatusMatch = activeTab === 'active' ? Number(staff.status) === 1 : Number(staff.status) === 0;
    const name = `${staff.fname} ${staff.lname}`.toLowerCase();
    const role = (staff.role_name || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return isStatusMatch && (name.includes(searchLower) || role.includes(searchLower));
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('active')}
            className={`px-6 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
              activeTab === 'active' ? 'bg-(--clr-primary) text-(--clr-text-secondary) blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Active
          </button>
          <button 
            onClick={() => setActiveTab('inactive')}
            className={`px-6 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
              activeTab === 'inactive' ? 'bg-(--clr-primary) text-(--clr-text-secondary)' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Inactive
          </button>
        </div>

        {/* search */}
        <div className="relative w-full max-w-xs">
          <input 
            type="text" 
            placeholder="Search staff..." 
            className="w-full p-2.5 pl-9 bg-white border border-gray-200 rounded-xl outline-none focus:ring focus:ring-(--clr-primary) transition-all text-sm"
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
          />
          <CiSearch className="absolute left-3 top-3 text-gray-400" size={18} />
        </div>
      </div>

      {/* staff cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.length > 0 ? (
          filteredStaff.map((staff) => {
            const scheduleItems = getScheduleArray(staff.schedule);
            
            return (
              <div key={staff.staff_id || staff.user_id} className="bg-white border border-gray-300 rounded-xl overflow-hidden flex flex-col">
                
                {/* header */}
                <div className="p-5 flex items-center gap-4 bg-gray-50/50 border-b border-gray-50">
                  <img 
                    src={staff.profile_pic ? `${API_URL}/${staff.profile_pic}` : noImage}
                    alt="profile"
                    className="w-12 h-12 object-cover rounded-2xl border-2 border-white"
                    onError={(e) => { e.target.src = noImage; }}
                  />
                  <div>
                    <h3 className="font-bold text-gray-800 leading-tight">{staff.fname} {staff.lname}</h3>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                      {staff.role_name || 'Staff'}
                    </p>
                  </div>
                </div>

                {/* sched */}
                <div className="p-5 space-y-1.5 bg-white">
                  {scheduleItems.length > 0 ? (
                    scheduleItems.map((day, idx) => (
                      <div key={idx} className={`flex justify-between items-center py-2 px-4 rounded-xl transition-colors ${day.available ? 'bg-gray-50/50' : 'bg-transparent'}`}>
                        <span className="text-[10px] font-bold text-gray-400 uppercase w-8">{day.day.slice(0,3)}</span>
                        <span className={`text-xs font-black ${day.available ? 'text-gray-900' : 'text-red-400 opacity-40 italic'}`}>
                          {day.available ? `${day.start} - ${day.end}` : 'DAY OFF'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center opacity-30">
                      <CiCalendar className="mx-auto" size={32} />
                      <p className="text-[10px] font-bold uppercase tracking-widest mt-2">No Schedule</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-20 text-center bg-gray-50">
            <p className="text-gray-400 text-sm font-medium">No results found in {activeTab} staff.</p>
          </div>
        )}
      </div>
    </div>
  );
}