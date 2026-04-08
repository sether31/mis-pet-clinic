import { HiXCircle, HiCalendar, HiUserCircle, HiClock, HiInformationCircle, HiShieldCheck } from 'react-icons/hi';
import { HiMiniExclamationCircle } from 'react-icons/hi2';
import { LuPhone } from 'react-icons/lu';
import { MdOutlineMailOutline } from 'react-icons/md';

const API_URL = import.meta.env.VITE_API_URL;

export default function AppointmentHistoryModal({ appointment, onClose }) {
  if (!appointment) return null;

  // Helper variables for name logic
  const ownerName = appointment?.owner_name || `${appointment?.owner_fname || ''} ${appointment?.owner_lname || ''}`.trim() || 'N/A';
  const staffName = appointment?.staff_name || (appointment?.staff_fname ? `Dr. ${appointment.staff_fname} ${appointment.staff_lname}` : 'Unassigned');

  // Status Badge Logic
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-green-100/50 border-green-200';
      case 'cancelled':
      case 'rejected': return 'text-red-600 bg-red-100/50 border-red-200';
      case 'confirmed': return 'text-blue-600 bg-blue-100/50 border-blue-200';
      default: return 'text-amber-600 bg-amber-100/50 border-amber-200';
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 text-left z-[100] bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-xl max-h-[90vh] overflow-hidden bg-white rounded-2xl">
        
        {/* --- Header --- */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">Appointment Record</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">History & Details • ID: #{appointment.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-all cursor-pointer hover:text-red-500">
            <HiXCircle size={32}/>
          </button>
        </div>

        {/* --- Scrollable Content --- */}
        <div className="p-4 lg:p-6 overflow-y-auto max-h-[80vh] space-y-6 custom-scrollbar">
          
          {/* Status Banner */}
          <div className={`flex items-center justify-between p-4 rounded-2xl border ${getStatusColor(appointment.status)}`}>
            <div className="flex items-center gap-2">
              <HiShieldCheck size={20}/>
              <span className="text-[10px] font-black uppercase tracking-widest">Current Record Status</span>
            </div>
            <span className="text-sm font-black uppercase">{appointment.status}</span>
          </div>

          {/* --- Patient Profile Card --- */}
          <div className="relative px-0 py-6 lg:p-6 overflow-hidden border border-gray-100 bg-gray-50/50 rounded-3xl">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              
              {/* Pet Image */}
              <div className="flex-none mx-auto sm:mx-0">
                <div className="relative w-32 h-32 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <img 
                    src={appointment?.pet_picture 
                      ? `${API_URL}/${appointment.pet_picture}` 
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(appointment?.pet_name || 'Pet')}&background=d1fae5&color=42756C&bold=true`
                    } 
                    className="object-cover w-full h-full rounded-xl" 
                    alt="pet" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(appointment?.pet_name || 'Pet')}&background=d1fae5&color=42756C&bold=true`;
                    }}
                  />
                </div>
              </div>

              {/* Patient Info Details */}
              <div className="flex-1 w-full text-center sm:text-left">
                <span className="inline-block px-3 py-1 mb-2 text-[9px] font-black tracking-widest text-gray-700 uppercase bg-gray-200 rounded-sm">
                  {appointment?.species || 'Species'}
                </span>
                <h3 className="text-3xl font-black leading-none tracking-tight text-gray-900 uppercase">
                  {appointment?.pet_name}
                </h3>
                
                <div className="grid grid-cols-3 gap-4 mt-5">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Breed</p>
                    <p className="text-xs font-bold text-gray-700 truncate">{appointment?.breed || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Sex</p>
                    <p className="text-xs font-bold text-gray-700">{appointment?.sex || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Age</p>
                    <p className="text-xs font-bold text-gray-700">{appointment?.age || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Relationship Section */}
            <div className="flex flex-col gap-2 px-2 mt-6 border-t border-gray-200/50 pt-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
                  Owner: <span className="text-gray-900">{ownerName}</span>
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 rounded-md bg-gray-100 text-gray-500"><LuPhone size={14} /></div>
                    <span className="text-xs font-bold text-gray-600">{appointment?.owner_phone || appointment?.phone_number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 rounded-md bg-gray-100 text-gray-500"><MdOutlineMailOutline size={14}/></div>
                    <span className="text-xs font-bold text-gray-600 truncate max-w-[180px]">{appointment?.owner_email || appointment?.email || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase mt-4">
                Assigned Staff: <span className="text-gray-900">{staffName}</span>
              </p>
            </div>

            {/* Medical Notes */}
            <div className={`mt-6 flex items-center gap-3 p-4 rounded-2xl border ${
              appointment?.medical_conditions && appointment.medical_conditions !== 'None' ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100'
            }`}>
              <div className={`p-2 rounded-lg ${appointment?.medical_conditions && appointment.medical_conditions !== 'None' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                <HiInformationCircle size={18} />
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Medical Notes</p>
                <p className={`text-sm font-bold leading-tight ${appointment?.medical_conditions && appointment.medical_conditions !== 'None' ? 'text-amber-900' : 'text-gray-500 italic'}`}>
                  {appointment?.medical_conditions || 'No known conditions recorded.'}
                </p>
              </div>
            </div>
          </div>

          {/* --- Service & Schedule Card --- */}
          <div className="relative p-6 transition-all border-2 border-green-100 bg-green-50 rounded-3xl">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-(--clr-primary) uppercase">Service Availed</span>
                <h4 className="text-2xl font-black text-(--clr-primary) uppercase leading-none">
                  {appointment?.service_name?.replace(/_/g, ' ') || 'Service'}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-(--clr-primary) uppercase">Total Fee</span>
                <p className="text-2xl font-black text-(--clr-primary)">
                  ₱{Number(appointment?.service_fee || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-green-200">
              <span className="text-[9px] font-black text-(--clr-primary) uppercase tracking-widest block mb-2">Schedule Log</span>
              <div className="flex items-center gap-2 p-3 text-sm font-bold text-blue-800 border border-blue-200 bg-blue-50 rounded-xl">
                <HiMiniExclamationCircle size={18} className="text-blue-600 shrink-0" />
                <div className="flex flex-wrap items-center gap-2">
                  <span>{new Date(appointment?.start).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="opacity-40">—</span>
                  <span>{new Date(appointment?.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>

            {/* Rejection/Cancellation Reason */}
            {appointment.cancellation_reason && (
               <div className="pt-4 mt-4 border-t border-red-200">
                  <p className="text-[10px] font-black text-red-500 uppercase mb-1">Reason for {appointment.status}:</p>
                  <p className="text-sm font-bold text-red-800 italic leading-relaxed">"{appointment.cancellation_reason}"</p>
               </div>
            )}
          </div>
        </div>

        {/* --- Footer Audit Trail --- */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
          <div className="flex flex-wrap items-center gap-3">
            {/* date */}
            <p className="text-[10px] font-bold text-gray-700 uppercase italic">
              Last Updated: {appointment.updated_at 
                ? new Date(appointment.updated_at).toLocaleString('en-US', { 
                    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                  }) 
                : '---'}
            </p>
            
            <span className="hidden md:block text-gray-300">|</span>
            
            {/* staff */}
            <div className="flex items-center gap-1">
              <span className={`text-[10px] font-black uppercase ${!appointment.updated_by_name ? 'text-amber-500' : 'text-(--clr-primary)'}`}>
                Updated By: {appointment.updated_by_name || 'System Generated'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}