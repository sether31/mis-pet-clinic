import { useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
// utils
import { authFetch } from '../../../../utils/authFetch';
import { formatDateTime } from '../../../../utils/dateFormatter';
// icons
import { HiXCircle, HiCheck, HiX, HiInformationCircle } from 'react-icons/hi';
import { HiMiniExclamationCircle } from 'react-icons/hi2';
import { useUI } from '../../../../hooks/useUI';
// components
import SubscriptionGate from '../../../../components/SubscriptionGate';

const API_URL = import.meta.env.VITE_API_URL;

export default function PendingAppointmentModal({ selectedAppointment, onClose, onRefresh }) {
  const { showLoader, hideLoader, loading } = useUI(); 
  const [feedback, setFeedback] = useState('');

  if (!selectedAppointment) return null;

  const isPast = new Date(selectedAppointment.start) < new Date();

  const handleAction = async (status) => {
    if (status === 'confirmed') {
      if (isPast) {
        toast.error("Cannot approve an expired appointment.");
        return;
      }
      await executeStatusUpdate('confirmed', feedback);
    } 
    
    else if (status === 'rejected') {
      const { value: reason, isConfirmed } = await Swal.fire({
        icon: 'warning',
        title: 'Reject Appointment?',
        text: "Please provide a reason for the owner:",
        input: 'textarea',
        inputValue: feedback, 
        inputPlaceholder: 'Type the reason here...',
        showCancelButton: true,
        confirmButtonText: 'Confirm Rejection',
        cancelButtonText: 'Cancel',
        buttonsStyling: false,
        reverseButtons: true,
        customClass: {
          container: '!z-[10001]', 
          popup: '!rounded-2xl border !border-gray-300 !max-w-lg',
          title: '!text-xl !font-black !uppercase !tracking-tight !text-red-600',
          confirmButton: 'rounded-xl px-6 py-3 cursor-pointer duration-300 text-white text-xs font-black uppercase bg-red-500 hover:bg-red-600 ml-3',
          cancelButton: 'rounded-xl px-6 py-3 cursor-pointer duration-300 text-gray-500 text-xs font-black uppercase bg-gray-100 hover:bg-gray-200'
        },
        preConfirm: (value) => {
          if (!value || !value.trim()) {
            Swal.showValidationMessage('A reason is required to notify the owner');
          }
          return value;
        }
      });

      if (isConfirmed && reason) {
        await executeStatusUpdate('rejected', reason);
      }
    }
  };

  const executeStatusUpdate = async (status, finalFeedback) => {
    const actionText = status === 'confirmed' ? 'Approving...' : 'Rejecting...';
    showLoader(actionText); 
    
    try {
      const response = await authFetch(`${API_URL}/api/clinic/general/appointment/update-appointment-status.php`, {
        method: 'POST',
        body: JSON.stringify({ 
          appointment_id: selectedAppointment.id, 
          status,
          feedback: finalFeedback
        })
      });
      
      if (response?.success) {
        toast.success(response.message || `Appointment ${status}`);
        onRefresh?.();
        onClose?.();
      } else {
        toast.error(response?.message || "Something went wrong");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      hideLoader(); 
    }
  };

  // Helper variables to handle fallbacks for names based on your DB columns
  const ownerName = selectedAppointment?.owner_name || `${selectedAppointment?.owner_fname || ''} ${selectedAppointment?.owner_lname || ''}`.trim() || 'N/A';
  const staffName = selectedAppointment?.staff_name || (selectedAppointment?.staff_fname ? `Dr. ${selectedAppointment.staff_fname} ${selectedAppointment.staff_lname}` : 'Unassigned');

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 text-left z-[100] bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-xl overflow-hidden bg-white rounded-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">Appointment Approval</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Verify and confirm booking</p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-all cursor-pointer hover:text-red-500">
            <HiXCircle size={32}/>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto max-h-[80vh] space-y-6">
          
          {/* --- Patient Profile Card --- */}
          <div className="relative px-6 py-6 overflow-hidden border border-gray-100 bg-gray-50/50 rounded-3xl">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              
              {/* Pet Image */}
              <div className="flex-none mx-auto sm:mx-0">
                <div className="relative w-32 h-32 bg-white border border-gray-100 rounded-2xl">
                  <img 
                    src={selectedAppointment?.pet_picture 
                      ? `${API_URL}/${selectedAppointment.pet_picture}` 
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedAppointment?.pet_name || 'Pet')}&background=d1fae5&color=42756C&bold=true`
                    } 
                    className="object-cover w-full h-full rounded-xl" 
                    alt="pet" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedAppointment?.pet_name || 'Pet')}&background=d1fae5&color=42756C&bold=true`;
                    }}
                  />
                </div>
              </div>

              {/* Patient Info Details */}
              <div className="flex-1 w-full text-center sm:text-left">
                <span className="inline-block px-3 py-1 mb-2 text-[9px] font-black tracking-widest text-gray-700 uppercase bg-gray-200 rounded-sm">
                  {selectedAppointment?.species || 'Species'}
                </span>
                <h3 className="text-3xl font-black leading-none tracking-tight text-gray-900 uppercase">
                  {selectedAppointment?.pet_name}
                </h3>
                
                {/* Main Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mt-5">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Breed</p>
                    <p className="text-xs font-bold text-gray-700 truncate">{selectedAppointment?.breed || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Sex</p>
                    <p className="text-xs font-bold text-gray-700">{selectedAppointment?.sex || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Age</p>
                    <p className="text-xs font-bold text-gray-700">{selectedAppointment?.age || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Relationship Section */}
            <div className="flex flex-col gap-2 px-2 mt-6">
              <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
                Owner: <span className="text-gray-900">{ownerName}</span>
              </p>
              <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
                Assigned Staff: <span className="text-gray-900">{staffName}</span>
              </p>
            </div>

            {/* Medical Conditions - Dedicated Warning Style */}
            <div className={`mt-6 flex items-center gap-3 p-4 rounded-2xl border ${
              selectedAppointment?.medical_conditions && selectedAppointment.medical_conditions !== 'N/A' && selectedAppointment.medical_conditions !== 'None'
              ? 'bg-amber-50 border-amber-100' 
              : 'bg-white border-gray-100'
            }`}>
              <div className={`p-2 rounded-lg ${
                selectedAppointment?.medical_conditions && selectedAppointment.medical_conditions !== 'N/A' && selectedAppointment.medical_conditions !== 'None'
                ? 'bg-amber-500 text-white' 
                : 'bg-gray-100 text-gray-400'
              }`}>
                <HiInformationCircle size={18} />
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Medical Notes / Conditions</p>
                <p className={`text-sm font-bold leading-tight ${
                  selectedAppointment?.medical_conditions && selectedAppointment.medical_conditions !== 'N/A' && selectedAppointment.medical_conditions !== 'None'
                  ? 'text-amber-900' 
                  : 'text-gray-500 italic'
                }`}>
                  {selectedAppointment?.medical_conditions || 'No known conditions recorded.'}
                </p>
              </div>
            </div>
          </div>

          {/* --- Service & Schedule Highlight Card --- */}
          <div className="relative p-6 transition-all border-2 border-green-100 bg-green-50 rounded-3xl">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-(--clr-primary) uppercase">Service Requested</span>
                <h4 className="text-2xl font-black text-(--clr-primary) uppercase leading-none">
                  {selectedAppointment?.service_name?.replace(/_/g, ' ') || 'Service'}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-(--clr-primary) uppercase">Service Fee</span>
                <p className="text-2xl font-black text-(--clr-primary)">
                  ₱{Number(selectedAppointment?.service_fee || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* --- ADDED: Service Description --- */}
            <div className="pt-4 mt-4 border-t border-green-200/50">
              <p className="text-sm italic font-medium leading-relaxed text-(--clr-primary)">
                "{selectedAppointment?.service_description || "Standard consultation and professional health assessment."}"
              </p>
            </div>
            
            {/* Schedule Segment mapped into the Service Card */}
            <div className="pt-4 mt-4 border-t border-green-200">
              <span className="text-[9px] font-black text-(--clr-primary) uppercase tracking-widest block mb-2">Requested Schedule</span>
              <div className="flex items-center gap-2 p-3 text-sm font-bold text-blue-800 border border-blue-200 bg-blue-50 rounded-xl">
                <HiMiniExclamationCircle size={18} className="text-blue-600 shrink-0" />
                <div className="flex flex-wrap items-center gap-2">
                  <span>{formatDateTime(selectedAppointment?.start)}</span>
                  <span className="opacity-40">—</span>
                  <span>{formatDateTime(selectedAppointment?.end)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* --- Action Buttons --- */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <SubscriptionGate>
              <button 
                onClick={() => handleAction('confirmed')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-4 text-xs font-black tracking-widest text-white uppercase bg-(--clr-primary) rounded-2xl hover:bg-(--clr-primary)/90 disabled:opacity-50 cursor-pointer transition-all active:scale-95"
              >
                <HiCheck size={20}/>
                {loading ? "Approving..." : "Approve Booking"}
              </button>
            </SubscriptionGate>
            
            <button 
              onClick={() => handleAction('rejected')}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-4 text-xs font-black tracking-widest text-red-500 uppercase transition-all border-2 border-red-500 cursor-pointer rounded-2xl hover:bg-red-500 hover:text-white disabled:opacity-50 active:scale-95"
            >
              <HiX size={20}/>
              {loading ? "Rejecting..." : "Reject Booking"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}