import { useState } from 'react';
import Swal from 'sweetalert2';
// components
import SubscriptionGate from '../../../../components/SubscriptionGate';
// icons
import { HiXCircle, HiInformationCircle } from 'react-icons/hi';
import noImage from '../../../../assets/images/no-image.jpg';

const API_URL = import.meta.env.VITE_API_URL;

export default function ShopModal({ order, onClose, onUpdate }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLocked = ['completed', 'cancelled', 'rejected'].includes(order.order_status);

  const actionName = order.order_status === 'pending' ? 'Reject' : 'Cancel';
  const targetStatus = order.order_status === 'pending' ? 'rejected' : 'cancelled';

  // Cancellation/Rejection
  const handleRejectClick = async () => {
    const { value: reason, isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: `${actionName} Order?`,
      text: `Please provide a reason for ${actionName.toLowerCase()}ing this order:`,
      input: 'textarea',
      inputPlaceholder: 'e.g., Item is out of stock / Customer no-show...',
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
    setIsSubmitting(true);
    await onUpdate(order.order_id, newStatus);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-xl overflow-hidden bg-white rounded-2xl animate-in fade-in slide-in-from-bottom-4">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">
              Order Details
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Ref: #{order.order_id}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-all cursor-pointer hover:text-red-500">
            <HiXCircle size={32}/>
          </button>
        </div>

        <div className="flex flex-col p-8 space-y-6">
          
          {/* Customer Info */}
          <div className="flex items-center justify-between p-5 border border-blue-100 bg-blue-50/50 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 overflow-hidden bg-white border-2 border-white rounded-full shadow-sm shrink-0">
                <img 
                  src={order.profile_picture ? `${API_URL}/${order.profile_picture}` : noImage} 
                  alt={order.owner_name}
                  className="object-cover w-full h-full"
                />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Customer Name</p>
                <p className="text-base font-black text-(--text-primary) uppercase mb-1">{order.owner_name}</p>
                <p className="text-[10px] font-bold text-(--text-primary)mt-1 uppercase">
                  Pickup Date: 
                  <span className='text-blue-500 ml-1'>
                    {new Date(order.pickup_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Product  */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reserved Items</h4>        
            <div className="flex items-center justify-between p-4 bg-white border border-gray-300 rounded-2xl">
              <div className="flex items-center flex-1 gap-4">
                <div className="w-12 h-12 overflow-hidden bg-gray-100 border border-gray-200 shrink-0 rounded-xl">
                  <img 
                    src={order.prod_pic ? `${API_URL}/${order.prod_pic}` : noImage} 
                    alt={order.product_name}
                    className="object-cover w-full h-full"
                  />
                </div>
                
                <div>
                  <p className="text-[12px] font-black text-gray-800 uppercase flex gap-2 items-center">
                    {order.product_name}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      ₱{parseFloat(order.unit_price).toLocaleString()} x {order.quantity}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-4 py-2 border border-gray-200 bg-gray-50 rounded-xl">
                  <span className="text-[10px] font-black text-gray-600 uppercase">
                    Subtotal: ₱{(parseFloat(order.unit_price) * parseInt(order.quantity)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Area & Total */}
          <div className="pt-6 mt-auto border-t border-gray-100">
            <div className="flex flex-col gap-4">
              
              {/* Payment Info */}
              <div className="px-2 space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  <span>Payment Method</span>
                  <span className="text-gray-600">Cash on Pickup</span>
                </div>
              </div>

              {/* Total Due Black Box */}
              <div className="flex items-center justify-between text-white bg-black p-6 rounded-[1.5rem]">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Due</p>
                  <p className="text-3xl font-black tracking-tighter text-(--clr-primary)">
                    ₱{parseFloat(order.total_amount).toLocaleString()}
                  </p>
                </div>
                
                {/* Status Badges or Action Buttons */}
                {isLocked ? (
                  <div className={`px-6 py-3 font-black text-[10px] uppercase tracking-widest rounded-xl border flex flex-col items-end justify-center gap-1 ${
                    order.order_status === 'completed' 
                      ? 'bg-green-500/10 text-(--clr-primary) border-green-500/20' 
                      : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    <span>Status: {order.order_status == 'completed' ? 'Fully Paid' : order.order_status}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {order.order_status === 'pending' && (
                      <SubscriptionGate>
                        <button 
                          onClick={() => handleAction('confirmed')} 
                          disabled={isSubmitting} 
                          className="px-6 py-3 font-black text-[10px] uppercase tracking-widest bg-(--clr-primary) text-white rounded-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
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
                          className="px-6 py-3 font-black text-[10px] uppercase tracking-widest bg-(--clr-primary) text-white rounded-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        >
                          Mark as Paid & Done
                        </button>
                      </SubscriptionGate>
                    )}
                  </div>
                )}
              </div>

              {/* Reject/Cancel Button */}
              {!isLocked && (
                <button 
                  onClick={handleRejectClick}
                  disabled={isSubmitting}
                  className="w-full py-4 mt-2 text-[10px] font-black text-red-500 uppercase tracking-widest border-2 border-red-50 rounded-xl hover:bg-red-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionName} Order
                </button>
              )}

              {/* Show cancellation reason if applicable */}
              {isLocked && order.cancellation_reason && (
                <div className="p-4 mt-2 bg-red-50 border border-red-100 rounded-xl flex gap-3 items-start">
                  <HiInformationCircle className="text-red-500 mt-0.5 shrink-0" size={16} />
                  <div>
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                      {order.order_status === 'rejected' ? 'Rejection' : 'Cancellation'} Reason
                    </p>
                    <p className="text-xs font-bold text-red-800 mt-1">{order.cancellation_reason}</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}