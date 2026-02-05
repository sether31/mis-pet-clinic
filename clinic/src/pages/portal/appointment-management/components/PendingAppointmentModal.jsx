import { useState } from 'react';
import { toast } from 'react-toastify';
// utils
import { authFetch } from '../../../../utils/authFetch';
import { formatDateTime } from '../../../../utils/dateFormatter';
// icons
import { HiXCircle, HiCheck, HiX, HiOutlineChatAlt2 } from 'react-icons/hi';
import { HiMiniExclamationCircle } from 'react-icons/hi2';
import { useUI } from '../../../../hooks/useUI'
// images
import noImage from '../../../../assets/images/no-image.jpg'


const API_URL = import.meta.env.VITE_API_URL;

export default function PendingAppointmentModal({ selectedAppointment, onClose, onRefresh }) {
  const { showLoader, hideLoader, loading } = useUI(); 
  const [feedback, setFeedback] = useState('');

  if (!selectedAppointment) return null;

  const isPast = new Date(selectedAppointment.start) < new Date();

  const handleAction = async (status) => {
    if(status === 'confirmed' && isPast) {
      toast.error("Cannot approve an expired appointment.");
      return;
    }

    // check if have feedback esp if expired
    if(status === 'rejected' && isPast && !feedback.trim()) {
      toast.warning("Please provide a reason for the owner.");
      return;
    }
    
    const actionText = status === 'confirmed' ? 'Approving...' : 'Rejecting...';
    showLoader(actionText); 
    
    try {
      const response = await authFetch(`${API_URL}/api/clinic/general/appointment/update-appointment-status.php`, {
        method: 'POST',
        body: JSON.stringify({ 
          appointment_id: selectedAppointment.id, 
          status,
          feedback: feedback
        })
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

        {/* patient */}
        <div className="p-8 overflow-y-auto max-h-[80vh]">
          <div className="flex justify-center mb-4">
            <div className="flex-none overflow-hidden border border-gray-300 w-28 h-28 rounded-3xl">
              <img 
                src={selectedAppointment?.pet_picture 
                  ? `${API_URL}/uploads/pets/${selectedAppointment.pet_picture}` 
                  : noImage
                } 
                className="object-cover w-full h-full" 
                alt="pet" 
                onError={(e) => {
                  e.target.onerror = null; 
                  e.target.src = noImage;
                }}
              />
            </div>
          </div>

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

          {/* schedule */}
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

          {isPast && (
            <div className="p-4 my-4 border bg-amber-50/50 rounded-2xl border-amber-200">
              <label className="flex items-center gap-2 mb-2 ml-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                <HiOutlineChatAlt2 size={14} />
                Reason for Rejection
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="This slot has passed. Please book a new schedule via the app..."
                className="w-full p-2 text-sm bg-white border border-amber-300 rounded-xl focus:ring focus:ring-amber-500 focus:border-transparent outline-none transition-all resize-none h-24"
              />
              <p className="mt-2 text-[9px] font-bold text-amber-600 uppercase italic">
                * This message will be sent to the pet owner.
              </p>
            </div>
          )}

          {/* warning */}
          {isPast && (
            <div className="flex items-start gap-2 p-3 border bg-amber-50 border-amber-200 rounded-xl">
              <HiMiniExclamationCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <p className="text-[10px] font-bold uppercase text-amber-700 leading-tight">
                This request has expired because the scheduled date has already passed. Please reject this request so the user can re-book.
              </p>
            </div>
          )}
          {/* action btn */}
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
      <label className="ml-1 text-[10px] font-bold uppercase">{label}</label>
      <div className="w-full p-2 text-sm font-semibold capitalize truncate rounded-lg bg-gray-50/80">
        {value || 'N/A'}
      </div>
    </div>
  );
}