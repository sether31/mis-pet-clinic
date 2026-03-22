import { useState } from 'react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
// components
import SubscriptionGate from '../../../../components/SubscriptionGate';
// icons
import { HiXCircle, HiInformationCircle } from 'react-icons/hi';
import noImage from '../../../../assets/images/no-image.jpg';

const API_URL = import.meta.env.VITE_API_URL;

export default function ShopModal({ order, onClose, onUpdate }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getAvatarUrl = (name) => {
    const isGuest = !name || name.trim() === "";
    const displayName = isGuest ? 'G' : name;
  
    const bg = 'd1fae5';
    const color = '42756C';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${bg}&color=${color}&bold=true`;
  };

  //  Safely handle Guest Sales which have NO pickup_date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let isOverdue = false;
  if (order.pickup_date) {
    const pickupDate = new Date(order.pickup_date);
    pickupDate.setHours(0, 0, 0, 0);
    isOverdue = pickupDate < today;
  }

  const isLocked = ['completed', 'cancelled', 'rejected'].includes(order.order_status);

  // Dynamic naming based on current status
  const actionName = order.order_status === 'pending' ? 'Reject' : 'Cancel';
  const targetStatus = order.order_status === 'pending' ? 'rejected' : 'cancelled';

  const handleRejectClick = async () => {
    const { value: reason, isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: `${actionName} Order?`,
      text: isOverdue 
        ? `This reservation has expired. Please provide a reason for clearing this order:` 
        : `Please provide a reason for ${actionName.toLowerCase()}ing this order:`,
      input: 'textarea',
      inputPlaceholder: 'ex. Item is out of stock / Customer did not show...',
      showCancelButton: true,
      confirmButtonText: `Confirm ${actionName}`,
      cancelButtonText: 'Back',
      buttonsStyling: false,
      reverseButtons: true,
      customClass: {
        popup: '!rounded-xl border !border-gray-300 !max-w-lg',
        title: '!text-xl !font-black !uppercase !tracking-tight !text-red-600',
        htmlContainer: '!text-sm !font-medium !text-gray-500',
        input: '!rounded-xl !border-gray-300 !text-sm !focus:ring-(--clr-primary) !outline:none !m-4',
        confirmButton: 'rounded-lg px-5 py-2.5 cursor-pointer transition-all active:scale-95 text-white text-sm font-bold bg-red-500 hover:bg-red-600',
        cancelButton: 'rounded-lg px-5 py-2.5 active:scale-95 transition-all cursor-pointer text-sm font-bold text-gray-500 hover:bg-gray-100'
      },
      preConfirm: (value) => {
        if(!value) {
          Swal.showValidationMessage('A reason is required');
        }
        return value;
      }
    });

    if (isConfirmed && reason) {
      setIsSubmitting(true);
      await onUpdate(order.order_id, targetStatus, reason);
      setIsSubmitting(false);
    }
  };

  const handleAction = async (newStatus) => {
    if (isOverdue && newStatus === 'confirmed') {
      toast.error("Cannot approve an expired reservation.");
      return;
    }
    
    setIsSubmitting(true);
    await onUpdate(order.order_id, newStatus);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-xl max-h-[95vh] overflow-hidden bg-white rounded-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">Order Details</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ref: #{order.order_id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-all cursor-pointer hover:text-red-500">
            <HiXCircle size={32}/>
          </button>
        </div>

        <div className="flex flex-col p-8 space-y-6 overflow-y-auto custom-scrollbar">
          {isOverdue && !isLocked && (
            <div className="flex items-center gap-3 p-4 border border-amber-200 bg-amber-50 rounded-xl">
              <HiInformationCircle className="text-amber-500" size={20} />
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                This reservation is overdue
              </p>
            </div>
          )}
          
          {/* Customer Info */}
          <div className="flex items-center justify-between p-5 border border-blue-100 bg-blue-50/50 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 overflow-hidden bg-white rounded-2xl shrink-0">
                <img 
                  src={order.profile_picture 
                    ? `${API_URL}/${order.profile_picture}` 
                    : getAvatarUrl(order.owner_name)} 
                  onError={(e) => {
                    e.target.src = noImage; 
                  }}
                  alt="Customer"
                  className="object-cover w-full h-full"
                />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Customer Name</p>
                {/* 👇 Added Guest Walk-in styling fallback */}
                <p className={`text-base font-black uppercase mb-1 ${order.owner_name ? 'text-(--text-primary)' : 'text-gray-500 italic'}`}>
                  {order.owner_name || "Guest Walk-in"}
                </p>
                
                {/* 👇 Handle missing dates for direct sales */}
                <p className="text-[10px] font-bold uppercase mt-1">
                  {order.pickup_date ? (
                    <>
                      Pickup Date: 
                      <span className={`${isOverdue ? 'text-red-500' : 'text-blue-500'} ml-1 font-black`}>
                        {new Date(order.pickup_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        {isOverdue && " (OVERDUE)"}
                      </span>
                    </>
                  ) : (
                    <span className="font-black text-blue-500">Direct Cash Sale (Walk-in)</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Reserved Items Section */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              {order.pickup_date ? "Reserved Items" : "Purchased Items"}
            </h4>        
            <div className="flex items-center justify-between p-4 bg-white border border-gray-300 rounded-2xl">
              <div className="flex items-center flex-1 gap-4">
                <div className="w-12 h-12 overflow-hidden bg-gray-100 border border-gray-200 shrink-0 rounded-xl">
                  <img src={order.prod_pic ? `${API_URL}/${order.prod_pic}` : noImage} alt={order.product_name} className="object-cover w-full h-full" />
                </div>
                <div>
                  <p className="text-[12px] font-black text-gray-800 uppercase">{order.product_name}</p>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">
                    ₱{parseFloat(order.unit_price).toLocaleString()} x {order.quantity}
                  </p>
                </div>
              </div>
              <div className="px-4 py-2 border border-gray-200 bg-gray-50 rounded-xl">
                <span className="text-[10px] font-black text-gray-600 uppercase">
                  Subtotal: ₱{(parseFloat(order.unit_price) * parseInt(order.quantity)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="pt-6 mt-auto border-t border-gray-100">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between text-white bg-black p-6 rounded-[1.5rem]">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Due</p>
                  <p className="text-3xl font-black tracking-tighter text-(--clr-primary)">
                    ₱{parseFloat(order.total_amount).toLocaleString()}
                  </p>
                </div>
                
                {isLocked ? (
                  <div className={`px-6 py-3 font-black text-[10px] uppercase tracking-widest rounded-xl border ${
                    order.order_status === 'completed' 
                      ? 'bg-green-500/10 text-(--clr-primary) border-green-500/20' 
                      : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    {order.order_status === 'completed' ? 'Fully Paid' : order.order_status}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {order.order_status === 'pending' && (
                      <SubscriptionGate>
                        <button 
                          onClick={() => handleAction('confirmed')} 
                          disabled={isSubmitting} 
                          className="px-6 py-3 font-black text-[10px] uppercase tracking-widest text-white rounded-xl transition-all cursor-pointer bg-(--clr-primary) hover:bg-(--clr-primary)/95 active:scale-95"
                        >
                          Confirm & Pack
                        </button>
                      </SubscriptionGate>
                    )}
                    
                    {order.order_status === 'confirmed' && (
                      <SubscriptionGate>
                        <button 
                          onClick={() => handleAction('completed')} 
                          disabled={isSubmitting}
                          className="px-6 py-3 font-black text-[10px] uppercase tracking-widest text-white rounded-xl transition-all cursor-pointer bg-(--clr-primary) hover:bg-(--clr-primary)/95 active:scale-95"
                        >
                          Mark as Paid & Done
                        </button>
                      </SubscriptionGate>
                    )}
                  </div>
                )}
              </div>

              {/* Reject/Cancel */}
              {!isLocked && (
                <button 
                  onClick={handleRejectClick}
                  disabled={isSubmitting}
                  className="w-full py-4 mt-2 text-[10px] font-black text-red-500 uppercase tracking-widest border-2 border-red-50 rounded-xl hover:bg-red-50 active:scale-95 transition-all cursor-pointer"
                >
                  {isOverdue ? 'Reject Overdue Order' : `${actionName} Order`}
                </button>
              )}

              {/* Cancellation Reason Footer */}
              {isLocked && order.cancellation_reason && (
                <div className="flex items-start gap-3 p-4 mt-2 border border-red-100 bg-red-50 rounded-xl">
                  <HiInformationCircle className="text-red-500 mt-0.5 shrink-0" size={16} />
                  <div>
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                      {order.order_status === 'rejected' ? 'Rejection' : 'Cancellation'} Reason
                    </p>
                    <p className="mt-1 text-xs font-bold text-red-800">{order.cancellation_reason}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] font-bold text-gray-700 uppercase italic">
                      Last Updated: {order?.updated_at 
                      ? new Date(order.updated_at).toLocaleString('en-US', { 
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                        }) 
                      : '---'}
                    </p>
                    
                    <span className="text-gray-300">|</span>
                    
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] font-black uppercase ${!order?.updated_by_name ? 'text-amber-500' : 'text-(--clr-primary)'}`}>
                        Updated By: {order?.updated_by_name || 'No record yet'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}