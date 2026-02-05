import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../../../hooks/useUI';
// utils
import { authFetch } from '../../../../utils/authFetch';
// icons
import { 
  HiXCircle, HiTrash, HiPlus, HiMinus, 
  HiCash, HiCreditCard, HiInformationCircle, 
  HiChevronRight, HiExclamation 
} from 'react-icons/hi';
import { FaRectangleList } from "react-icons/fa6";
// images
import noImage from '../../../../assets/images/no-image.jpg'
import { IoLockClosedOutline } from 'react-icons/io5';


const API_URL = import.meta.env.VITE_API_URL;

export default function AppointmentPaymentModal({ user, activeTask, branchId, onClose, onRefresh }) {
  const { showLoader, hideLoader } = useUI();
  const [activeTab, setActiveTab] = useState('overview');
  const [availableProducts, setAvailableProducts] = useState([]);
  const [billedItems, setBilledItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const serviceFee = parseFloat(activeTask?.service_fee || 0);
  const isLocked = ['billed', 'completed'].includes(activeTask?.status);

  useEffect(() => {
    if (!branchId) return;
    const fetchProducts = async () => {
      try {
        const res = await authFetch(`${API_URL}/api/clinic/inventory/get-products.php?branch_id=${branchId}`);
        if (res?.success) setAvailableProducts(res.data || []);
      } catch(err) { 
        toast.error("Failed to load inventory."); 
      }
    };
    fetchProducts();
  }, [branchId]);

  useEffect(() => {
    // only fetch if billed or completed
    if(isLocked && activeTask?.id) {
      const fetchBilledDetails = async () => {
        try {
          const res = await authFetch(`${API_URL}/api/clinic/general/appointment/get-billing-details.php?appointment_id=${activeTask.id}`);
          
          if(res?.success) {
            // map billed items
            const productsOnly = res.data
              .filter(item => item.product_id !== null)
              .map(item => ({
                product_id: item.product_id,
                name: item.name,
                price: parseFloat(item.price), 
                qty: parseInt(item.qty),
                type: 'product'
              }));

            setBilledItems(productsOnly);
            
            // sync payment and status
            if(res.payment_method) {
              setPaymentMethod(res.payment_method.toLowerCase());
            }
            if(res.payment_status) {
              setPaymentStatus(res.payment_status.toLowerCase());
            }
          }
        } catch(err) {
          console.error("Failed to load billing details", err);
          toast.error("Could not retrieve billing history.");
        }
      };
      fetchBilledDetails();
    }
  }, [activeTask?.id, isLocked]);

  // handle quantity
  const handleQtyChange = (productId, value) => {
    if(isLocked) return; 

    if(value === "") {
      setBilledItems(prev => prev.map(item => 
        item.product_id === productId ? { ...item, qty: "" } : item
      ));
      return;
    }

    const prodRef = availableProducts.find(p => String(p.product_id) === String(productId));
    const maxStock = parseInt(prodRef?.stock_level || 0);
    
    let newQty = parseInt(value);

    if(newQty > maxStock) {
      toast.warn(`Only ${maxStock} in stock.`);
      newQty = maxStock;
    }

    setBilledItems(prev => prev.map(item => 
      item.product_id === productId ? { ...item, qty: isNaN(newQty) ? "" : newQty } : item
    ));
  };

  const handleQtyBlur = (productId, value) => {
    let finalQty = parseInt(value);
    if(isNaN(finalQty) || finalQty < 1) {
      finalQty = 1;
    }
    setBilledItems(prev => prev.map(item => 
      item.product_id === productId ? { ...item, qty: finalQty } : item
    ));
  };

  // handle add item
  const handleAddItem = (productId) => {
    const prod = availableProducts.find(p => String(p.product_id) === String(productId));
    if (!prod || parseInt(prod.stock_level) <= 0) return toast.error("No stocks available!");

    const existing = billedItems.find(i => i.product_id === prod.product_id);
    if (existing) {
      handleQtyChange(prod.product_id, (parseInt(existing.qty) || 0) + 1);
    } else {
      setBilledItems([...billedItems, { ...prod, qty: 1 }]);
    }
  };

  const getPricingBreakdown = () => {
    const itemsSubtotal = billedItems.reduce((sum, i) => {
      const q = parseInt(i.qty) || 0;
      return sum + (parseFloat(i.price) * q);
    }, 0);
    
    return {
      service: serviceFee,
      items: itemsSubtotal,
      total: serviceFee + itemsSubtotal
    };
  };

  const pricing = getPricingBreakdown();

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this appointment? This will free up the time slot.")) return;

    showLoader('Cancelling...');
    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/appointment/update-appointment-status.php`, {
        method: 'POST',
        body: JSON.stringify({
          appointment_id: activeTask.id,
          status: 'cancelled',
          feedback: `Cancelled by ${user.role}`
        })
      });

      if(res?.success) {
        toast.info("Appointment cancelled successfully.");
        if (onRefresh) onRefresh();
        onClose();
      } else {
        toast.error("Failed to cancel.");
      }
    } catch(err) {
      toast.error("An error occurred during cancellation.");
    } finally {
      hideLoader();
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || (billedItems.length === 0 && serviceFee === 0)) return;

    setIsSubmitting(true);
    showLoader('Processing...');
    try {
      const payload = {
        appointment_id: activeTask.id,
        branch_id: branchId,
        total: parseFloat(pricing.total.toFixed(2)),
        payment_method: paymentMethod,
        items: [
          { 
            service_id: activeTask.branch_service_id,
            name: activeTask?.service_name || 'Service', 
            price: parseFloat(serviceFee.toFixed(2)), 
            qty: 1, 
            type: 'service' 
          },
          ...billedItems.map(i => ({ 
            product_id: i.product_id, 
            name: i.name, 
            price: parseFloat(parseFloat(i.price).toFixed(2)), 
            qty: parseInt(i.qty) || 1, 
            type: 'product' 
          }))
        ]
      };
      const res = await authFetch(`${API_URL}/api/clinic/general/appointment/pay-appointment.php`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if(res?.success) {
        toast.success(res.message || "Payment successful");
        if (onRefresh) onRefresh();
        onClose(); 
      } else {
        toast.error("Transaction failed");
      }
    } catch(err) {
      toast.error("Transaction failed");
    } finally {
      hideLoader();
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999] bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-2xl overflow-hidden bg-white rounded-[2.5rem]">
        
        {/* tabs */}
        <div className="flex border-b bg-gray-50/50">
          <button onClick={() => setActiveTab('overview')} className={`flex-1 flex gap-1 items-center justify-center py-6 font-black text-[10px] uppercase tracking-[0.2em] transition-all cursor-pointer ${activeTab === 'overview' ? 'text-(--clr-primary) bg-white' : 'text-gray-400'}`}>
            <FaRectangleList size={18} /> Details
          </button>
          <button onClick={() => setActiveTab('payment')} className={`flex-1 flex gap-1 items-center justify-center py-6 font-black text-[10px] uppercase tracking-[0.2em] transition-all cursor-pointer ${activeTab === 'payment' ? 'text-(--clr-primary) bg-white' : 'text-gray-400'}`}>
            <HiCreditCard size={18}/> Payment
          </button>
          <button onClick={onClose} className="px-6 text-gray-300 transition-colors cursor-pointer hover:text-red-500"><HiXCircle size={28}/></button>
        </div>

        {/* main content*/}
        <div className="p-8 h-[550px] flex flex-col">
          <div className="flex-1 pr-2 overflow-y-auto custom-scrollbar">
            {activeTab === 'overview' ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-6">
                  <div className="flex-none w-20 h-20 overflow-hidden bg-gray-100 border-4 border-white rounded-3xl">
                    {activeTask?.pet_image ? (
                      <img 
                        src={`${API_URL}/uploads/pets/${activeTask.pet_image}`} 
                        className="object-cover w-full h-full" 
                        alt="pet" 
                      />
                    ) : (
                      <img 
                        src={noImage} 
                        className="object-cover w-full h-full opacity-60" 
                        alt="no-pet" 
                      />
                    )}
                  </div>
                  <div>
                    <span className="block mb-1 text-[10px] font-black text-gray-400 uppercase">
                      Patient Name
                    </span>
                    <h3 className="text-3xl font-black leading-none tracking-tighter uppercase">
                      {activeTask?.pet_name}
                    </h3>
                    <p className="mt-2 text-[10px] font-black tracking-widest text-gray-400 uppercase">
                      Owner: <span className="text-(--clr-primary)">{activeTask?.owner_name}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-4 border border-green-100 p-7 bg-green-50 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-black text-(--clr-primary) uppercase tracking-widest">Selected Service</span>
                      <h4 className="mt-1 text-xl font-black text-(--clr-primary) uppercase">
                        {activeTask?.service_name || 'Medical Checkup'}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black text-(--clr-primary) uppercase tracking-widest">Service Fee</span>
                      <p className="text-xl font-black text-(--clr-primary)">₱{serviceFee.toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-sm italic font-medium leading-relaxed ">
                    "{activeTask?.service_description || "Standard consultation and professional health assessment."}"
                  </p>
                </div>
              </div>
            ) : (

              // payment tab
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                {isLocked && (
                  <div className="flex items-center justify-between p-4 bg-gray-100 border border-gray-200 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <IoLockClosedOutline className="text-gray-400" size={20} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Transaction Locked
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      paymentStatus === 'paid' ? 'bg-(--clr-primary) text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {paymentStatus}
                    </span>
                  </div>
                )}

                {/* service price */}
                <div className="flex items-center justify-between p-4 border border-blue-100 bg-blue-50/50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 text-white bg-blue-500 rounded-lg">
                      <HiInformationCircle size={18}/>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Service Price</p>
                      <p className="text-sm font-black text-blue-900 uppercase">{activeTask?.service_name}</p>
                    </div>
                  </div>
                  <p className="font-black tracking-tighter text-blue-600">₱{serviceFee.toLocaleString()}</p>
                </div>

                {/* payment selection */}
                <div className="grid grid-cols-2 gap-3">
                  {['cash', 'card'].map(m => (
                    <button 
                      key={m} 
                      type="button"
                      onClick={() => !isLocked && setPaymentMethod(m)} 
                      className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2
                      ${paymentMethod === m ? 'border-(--clr-primary) bg-(--clr-primary) text-white' : 'border-gray-100 text-gray-400 bg-white hover:border-gray-300'}
                      ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}>
                      {m === 'cash' ? <HiCash size={18}/> : <HiCreditCard size={18}/>} {m}
                    </button>
                    ))}
                </div>

                {/* add products */}
                <div className="space-y-4">
                  {!isLocked && (
                    <select className="w-full p-4 text-[10px] font-black uppercase tracking-widest bg-gray-100 border-2 border-transparent outline-none rounded-2xl focus:border-(--clr-primary)" onChange={(e) => { handleAddItem(e.target.value); e.target.value=""; }}>
                      <option value="">+ Add Items from Inventory</option>
                      {availableProducts.map(p => (
                        <option key={p.product_id} value={p.product_id} disabled={parseInt(p.stock_level) <= 0}>
                          {p.name.toUpperCase()} (STOCKS: {p.stock_level})
                        </option>
                      ))}
                    </select>
                  )}

                  {/* all added products */}
                  <div className="space-y-3">
                    {billedItems.map(item => {
                      const isLowStock = parseInt(item.stock_level) <= 5;
                      return (
                        <div key={item.product_id} className="flex items-center justify-between p-4 bg-white border border-gray-300 rounded-2xl">
                          <div className="flex-1">
                            <p className="text-[11px] font-black text-gray-800 uppercase">{item.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {!isLocked && (
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${isLowStock ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                                  {isLowStock && <HiExclamation className="inline mr-1" />}
                                  Stock: {item.stock_level}
                                </span>
                              )}
                              <span className="text-[9px] font-bold text-(--clr-primary)">₱{parseFloat(item.price).toLocaleString()}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                           {isLocked ? (
                              <div className="px-4 py-2 border border-gray-200 bg-gray-50 rounded-xl">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                  Qty: {item.qty}
                                </span>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center px-2 transition-all bg-gray-100 border border-transparent rounded-xl focus-within:border-(--clr-primary) focus-within:bg-white">
                                  <button 
                                    onClick={() => handleQtyChange(item.product_id, (parseInt(item.qty) || 0) - 1)} 
                                    className="p-2 cursor-pointer hover:text-(--clr-primary)"
                                  >
                                    <HiMinus size={14}/>
                                  </button>
                                  
                                  <input 
                                    type="number" 
                                    value={item.qty} 
                                    onChange={(e) => handleQtyChange(item.product_id, e.target.value)}
                                    onBlur={(e) => handleQtyBlur(item.product_id, e.target.value)}
                                    className="w-12 text-xs font-black text-center bg-transparent border-none outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />

                                  <button 
                                    onClick={() => handleQtyChange(item.product_id, (parseInt(item.qty) || 0) + 1)} 
                                    className="p-2 cursor-pointer hover:text-(--clr-primary)"
                                  >
                                    <HiPlus size={14}/>
                                  </button>
                                </div>

                                <button 
                                  onClick={() => setBilledItems(billedItems.filter(i => i.product_id !== item.product_id))} 
                                  className="text-gray-300 transition-colors cursor-pointer hover:text-red-500"
                                >
                                  <HiTrash size={18}/>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* buttons */}
          <div className="pt-6 mt-auto border-t border-gray-100">
            {activeTab === 'overview' ? (
              <div className="flex gap-3">
               {!isLocked && (
                  <button 
                    onClick={handleCancel}
                    className="flex-none px-6 py-5 text-[10px] font-black text-red-500 uppercase tracking-widest border-2 border-red-50 rounded-xl hover:bg-red-50 transition-all cursor-pointer"
                  >
                    Cancel Slot
                  </button>
                )}

                <button 
                  onClick={() => setActiveTab('payment')} 
                  className="flex-1 flex items-center justify-center gap-2 py-5 text-[10px] font-black text-white uppercase tracking-[0.2em] transition-all bg-(--clr-black) rounded-xl hover:bg-(--clr-primary) cursor-pointer duration-300 ease-in-out"
                >
                  {isLocked ? 'View Invoice Details' : 'Go to Payment'} <HiChevronRight size={18}/>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="px-2 space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <span>Service Fee</span>
                    <span>₱{pricing.service.toLocaleString()}</span>
                  </div>
                  {pricing.items > 0 && (
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      <span>Products ({billedItems.length})</span>
                      <span>₱{pricing.items.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-white bg-black p-6 rounded-[1.5rem]">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Due</p>
                    <p className="text-3xl font-black tracking-tighter text-(--clr-primary)">
                      ₱{pricing.total.toLocaleString()}
                    </p>
                  </div>
                  {isLocked ? (
                    <div className={`px-8 py-4 font-black text-[10px] uppercase tracking-widest rounded-xl border flex items-center gap-2 ${
                      paymentStatus === 'paid' 
                        ? 'bg-green-500/10 text-(--clr-primary) border-green-500/20' 
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}>
                      {paymentStatus === 'paid' ? (
                        <span>Fully Paid</span>
                      ) : (
                        'Already Billed'
                      )}
                    </div>
                  ) : (
                    <button 
                      onClick={handleSubmit} 
                      disabled={isSubmitting} 
                      className="px-8 py-4 font-black text-[10px] uppercase tracking-widest bg-(--clr-primary) text-white rounded-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                    >
                      {paymentMethod === 'cash' ? 'Process Payment' : 'Confirm & Bill'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}