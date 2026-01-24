import { toast } from 'react-toastify';
// utils
import { authFetch } from '../../../utils/authFetch';
import { formatDateTime } from '../../../utils/dateFormatter';
// icons
import { HiXCircle, HiCheck, HiX } from 'react-icons/hi';
import { HiMiniExclamationCircle } from 'react-icons/hi2';
import { useUI } from '../../../hooks/useUI';

const API_URL = import.meta.env.VITE_API_URL;

export default function PendingAppointmentModal({ selectedAppointment, onClose, onRefresh }) {
  const { showLoader, hideLoader, loading } = useUI(); 
  if (!selectedAppointment) return null;

  const handleAction = async (status) => {
    const actionText = status === 'confirmed' ? 'Approving...' : 'Rejecting...';
    showLoader(actionText); 
    
    try {
      const response = await authFetch(`${API_URL}/api/clinic/general/appointment/update-appointment-status.php`, {
        method: 'POST',
        body: JSON.stringify({ appointment_id: selectedAppointment.id, status })
      });
      
      if(response?.success) {
        toast.success(response.message || "Status updated");
        onRefresh?.();
        onClose?.();
      } else {
        toast.error(response?.message || "Something went wrong");
      }
    } catch(error) {
      toast.error("Something went wrong");
    } finally {
      hideLoader(); 
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 text-left z-[100] bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-xl overflow-hidden bg-white rounded-2xl">
        
        {/* header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">Appointment Approval</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest">Verify and confirm booking</p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-all cursor-pointer hover:text-red-500">
            <HiXCircle size={32}/>
          </button>
        </div>

        <div className="p-8 space-y-4 overflow-y-auto max-h-[80vh]">
          <div className="grid grid-cols-2 gap-4">
            <InfoBox label="Patient" value={selectedAppointment?.pet_name} />
            <InfoBox 
              label="Owner" 
              value={selectedAppointment?.owner_fname ? `${selectedAppointment.owner_fname} ${selectedAppointment.owner_lname}` : 'N/A'} 
            />
          </div>

          <InfoBox label="Service Requested" value={selectedAppointment?.service_name?.replace(/_/g, ' ')} />

          <div className="grid grid-cols-2 gap-4">
            <InfoBox 
              label="Assigned Dr." 
              value={selectedAppointment?.staff_fname ? `Dr. ${selectedAppointment.staff_fname} ${selectedAppointment.staff_lname}` : 'Unassigned'} 
            />
            <div className="space-y-1">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-widest">Service Fee</label>
              <div className="w-full p-2 text-sm font-black text-center text-(--clr-text-header) rounded-lg bg-green-50/50">
                ₱{Number(selectedAppointment?.service_fee || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="ml-1 text-[10px] font-bold uppercase tracking-widest">
              Schedule
            </label>
            <div className="flex items-center gap-3 p-3 text-sm font-bold text-blue-700 rounded-xl bg-blue-50/50">
              <HiMiniExclamationCircle size={18} className="shrink-0" />
              <div className="flex flex-wrap items-center gap-2">
                <span>{formatDateTime(selectedAppointment?.start)}</span>
                <span className="opacity-30">—</span>
                <span>{formatDateTime(selectedAppointment?.end)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button 
              onClick={() => handleAction('confirmed')}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-4 text-xs font-black tracking-widest text-white uppercase bg-(--clr-primary) rounded-xl hover:bg-(--clr-primary)/90 disabled:opacity-50 ease-in-out duration-300 cursor-pointer"
            >
              <HiCheck size={18}/>
              {loading ? "Approving..." : "Approve Booking"}
            </button>
            <button 
              onClick={() => handleAction('rejected')}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-4 text-xs font-black tracking-widest text-red-500 uppercase duration-300 ease-in-out border border-red-500 cursor-pointer rounded-xl hover:bg-red-500 hover:text-white disabled:opacity-50"
            >
              <HiX size={18}/>
              {loading ? "Rejecting..." : "Reject"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="space-y-1">
      <label className="ml-1 text-[10px] font-bold uppercase tracking-widest">{label}</label>
      <div className="w-full p-2 text-sm font-semibold text-gray-600 capitalize truncate rounded-lg bg-gray-50/80">
        {value || 'N/A'}
      </div>
    </div>
  );
}