import { useState } from 'react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import SubscriptionGate from '../../../../components/SubscriptionGate';
import { HiXCircle, HiInformationCircle } from 'react-icons/hi';
import noImage from '../../../../assets/images/no-image.jpg';

const API_URL = import.meta.env.VITE_API_URL;

export default function ShopModal({ order, onClose, onUpdate }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getAvatarUrl = (name) => {
    const isGuest = !name || name.trim() === "";
    const displayName = isGuest ? 'G' : name;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=d1fae5&color=42756C&bold=true`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const isLocked = ['completed', 'cancelled', 'rejected'].includes(order.order_status);

  let isOverdue = false;
  if (order.pickup_date && !isLocked) {
    const pickupDate = new Date(order.pickup_date);
    pickupDate.setHours(0, 0, 0, 0);
    isOverdue = pickupDate < today;
  }

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

    // Logic for completing the order with the two-step SweetAlert design
    if (newStatus === 'completed') {
      const totalAmount = parseFloat(order.total_amount);

      // 1. GENERATE MULTI-ITEM HTML
      const itemsListHtml = (order.items || []).map(item => {
        const itemPrice = parseFloat(item.price || item.unit_price);
        const quantity = parseInt(item.quantity) || 0;
        const itemTotal = itemPrice * quantity;
        
        // Brand logic matching your specific requirements
        const brandRow = (item.brand_name && item.brand_type && item.brand_type !== 'N/A')
          ? `${item.brand_name} • ${item.brand_type}`
          : `${item.brand_name || 'No Brand'}`;

        return `
          <div class="mb-2 border-b border-gray-100 pb-2 last:border-0 last:mb-0">
            <div class="flex justify-between items-start text-left">
              <div class="text-left">
                <div class="text-[10px] font-black uppercase text-gray-800 leading-tight">${item.product_name}</div>
                <div class="text-[8px] font-bold text-gray-400 uppercase mt-0.5">${brandRow}</div>
              </div>
              <div class="text-right shrink-0 ml-4">
                <div class="text-[9px] font-black text-gray-800">x${quantity}</div>
                <div class="text-[9px] font-black text-(--clr-primary)">₱${itemTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      const sharedModalHtml = `
        <div class="text-left bg-gray-50 p-4 rounded-2xl border border-gray-200 mt-4">
          <div class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">Order Summary</div>
          <div class="max-h-36 overflow-y-auto pr-1 mb-2 custom-scrollbar">
            ${itemsListHtml}
          </div>
          <div class="border-t-2 border-dashed border-gray-300 my-3"></div>
          <div class="flex justify-between items-center">
            <span class="text-xs font-black text-gray-800 uppercase tracking-tight">Total Amount</span> 
            <span class="text-xl font-black text-(--clr-primary) tracking-tighter">₱${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
        </div>
      `;

      // 2. STEP 1: INPUT CASH
      const { value: cashAmount, isConfirmed } = await Swal.fire({
        title: 'Receive Payment',
        html: sharedModalHtml,
        input: 'number',
        inputAttributes: { min: totalAmount, step: '0.01', placeholder: '0.00' },
        inputLabel: 'Amount Received (₱)',
        showCancelButton: true,
        confirmButtonText: 'Calculate Change',
        cancelButtonText: 'Cancel',
        buttonsStyling: false,
        customClass: {
          container: '!z-[99999]',
          popup: '!rounded-2xl !border !border-gray-300 !max-w-md !py-8 !px-4',
          title: '!text-xl !font-black !uppercase !tracking-tight !text-gray-800',
          input: '!rounded-xl !text-lg !border-gray-300 !font-black !m-4 !w-[calc(100%-2rem)]',
          confirmButton: 'rounded-lg px-6 py-2.5 text-white text-xs font-black uppercase bg-(--clr-primary) mx-1 cursor-pointer active:scale-95 transition-all',
          cancelButton: 'rounded-lg px-6 py-2.5 text-xs font-black uppercase bg-gray-100 text-gray-500 mx-1 cursor-pointer active:scale-95 transition-all'
        },
        preConfirm: (value) => {
          if (!value || parseFloat(value) < totalAmount) {
            Swal.showValidationMessage(`Insufficient amount. Min: ₱${totalAmount.toLocaleString()}`);
            return false;
          }
          return value;
        }
      });

      // 3. STEP 2: SHOW CHANGE AND FINAL CONFIRM
      if (isConfirmed && cashAmount) {
        const change = cashAmount - totalAmount;
        
        const finalResult = await Swal.fire({
          icon: 'success',
          iconColor: 'var(--clr-primary)',
          title: 'Payment Summary',
          html: `
            <div class="bg-gray-50 p-5 rounded-2xl border border-gray-200 mt-4 text-left">
              <div class="flex justify-between text-[10px] font-black text-gray-400 uppercase mb-1">
                <span>Total Due:</span> 
                <span>₱${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div class="flex justify-between text-[10px] font-black text-gray-400 uppercase mb-3">
                <span>Cash Paid:</span> 
                <span>₱${parseFloat(cashAmount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div class="border-t-2 border-dashed border-gray-300 pt-3 flex justify-between items-center">
                <span class="text-sm font-black text-gray-800 uppercase">Change:</span>
                <span class="text-3xl font-black text-(--clr-primary) tracking-tighter">₱${change.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Complete Sale',
          cancelButtonText: 'Go Back',
          buttonsStyling: false,
          customClass: {
            container: '!z-[99999]',
            popup: '!rounded-2xl !border !border-gray-300 !max-w-md !py-8 !px-4',
            title: '!text-xl !font-black !uppercase !tracking-tight !text-gray-800',
            confirmButton: 'rounded-lg px-6 py-2.5 text-white text-xs font-black uppercase bg-(--clr-primary) mx-1 cursor-pointer active:scale-95 transition-all',
            cancelButton: 'rounded-lg px-6 py-2.5 text-xs font-black uppercase bg-gray-100 text-gray-500 mx-1 cursor-pointer active:scale-95 transition-all'
          }
        });

        if (finalResult.isConfirmed) {
          setIsSubmitting(true);
          // Pass payment data as the 4th argument to onUpdate
          await onUpdate(order.order_id, newStatus, null, { 
            cash_received: cashAmount, 
            cash_change: change 
          });
          setIsSubmitting(false);
        }
      }
      return;
    }

    // Default flow for 'confirmed' or other statuses
    setIsSubmitting(true);
    await onUpdate(order.order_id, newStatus);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm text-left">
      <div className="flex flex-col w-full max-w-xl max-h-[95vh] overflow-hidden bg-white rounded-2xl shadow-2xl">
        
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
          {/* Overdue Banner */}
          {isOverdue && (
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
              <div className="w-12 h-12 overflow-hidden bg-white rounded-2xl shrink-0 shadow-sm border border-blue-100">
                <img 
                  src={order.profile_picture 
                    ? `${API_URL}/${order.profile_picture}` 
                    : getAvatarUrl(order.owner_name)} 
                  onError={(e) => { e.target.src = noImage; }}
                  alt="Customer"
                  className="object-cover w-full h-full"
                />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Customer Name</p>
                <p className={`text-base font-black uppercase mb-1 ${order.owner_name ? 'text-gray-800' : 'text-gray-500 italic'}`}>
                  {order.owner_name || "Guest Walk-in"}
                </p>
                
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

          {/* Items Section */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              {order.pickup_date ? "Reserved Items" : "Purchased Items"}
            </h4>         
            
            {(order.items || []).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl">
                <div className="flex items-center flex-1 gap-4">
                  <div className="w-12 h-12 overflow-hidden bg-gray-100 border border-gray-200 shrink-0 rounded-xl">
                    <img 
                      src={item.prod_pic ? `${API_URL}/${item.prod_pic}` : noImage} 
                      alt={item.product_name} 
                      className="object-cover w-full h-full" 
                    />
                  </div>
                  <div>
                    <p className="text-[12px] font-black text-gray-800 uppercase leading-tight">
                      {item.product_name}
                      {item.brand_name && (
                        <span className="ml-1 text-gray-500 font-bold normal-case">
                          ({item.brand_name})
                        </span>
                      )}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.brand_type && item.brand_type !== "N/A" && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-[8px] font-black text-blue-600 rounded uppercase border border-blue-100">
                          {item.brand_type}
                        </span>
                      )}
                      
                      {item.dosage && (
                        <span className="px-1.5 py-0.5 bg-purple-50 text-[8px] font-black text-purple-600 rounded uppercase border border-purple-100">
                          {item.dosage}
                        </span>
                      )}
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 self-center">
                        ₱{parseFloat(item.price || item.unit_price).toLocaleString()} x {item.quantity}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2 border border-gray-200 bg-gray-50 rounded-xl">
                  <span className="text-[10px] font-black text-gray-600 uppercase">
                    Subtotal: ₱{(parseFloat(item.price || item.unit_price) * parseInt(item.quantity)).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Cash Details Section */}
          {order.order_status === 'completed' && (
            <div className="p-5 border border-green-100 bg-green-50/30 rounded-2xl space-y-2">
              <div className="flex justify-between text-[11px] font-bold uppercase text-gray-600">
                <span>Total Amount</span>
                <span className="font-black text-gray-800">
                  ₱{parseFloat(order.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </span>
              </div>
              
              <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400">
                <span>Cash Received</span>
                <span>
                  ₱{parseFloat(order.cash_received || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </span>
              </div>

              <div className="flex justify-between text-[10px] font-black uppercase text-(--clr-primary)">
                <span>Cash Change</span>
                <span>
                  ₱{parseFloat(order.cash_change || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </span>
              </div>
            </div>
          )}

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
                      ? 'bg-green-500/10 text-emerald-400 border-green-500/20' 
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

              {!isLocked && (
                <button 
                  onClick={handleRejectClick}
                  disabled={isSubmitting}
                  className="w-full py-4 text-[10px] font-black text-red-500 uppercase tracking-widest border-2 border-red-50 rounded-xl hover:bg-red-50 active:scale-95 transition-all cursor-pointer"
                >
                  {isOverdue ? 'Reject Overdue Order' : `${actionName} Order`}
                </button>
              )}

              {isLocked && order.cancellation_reason && (
                <div className="flex items-start gap-3 p-4 border border-red-100 bg-red-50 rounded-xl">
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
                <div className="flex items-center gap-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase italic">
                    Last Updated: {order?.updated_at 
                      ? new Date(order.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                      : '---'}
                  </p>
                  <span className="text-gray-200">|</span>
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
  );
}