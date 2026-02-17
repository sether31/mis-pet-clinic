import { useState, useEffect, useRef } from 'react'; 
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../../../hooks/useUI';
// utils
import { authFetch } from '../../../../utils/authFetch';
// icons
import { 
  HiXCircle, HiTrash, HiPlus, HiMinus, 
  HiCash, HiCreditCard, HiInformationCircle, 
  HiChevronRight, HiSearch, HiChevronDown 
} from 'react-icons/hi';
import { FaRectangleList } from "react-icons/fa6";
// images
import noImage from '../../../../assets/images/no-image.jpg'
import { IoLockClosedOutline } from 'react-icons/io5';
import Swal from 'sweetalert2';

const API_URL = import.meta.env.VITE_API_URL;

export default function AppointmentPaymentModal({ user, activeTask, branchId, onClose, onRefresh }) {
  const { showLoader, hideLoader } = useUI();
  const [activeTab, setActiveTab] = useState('overview');
  const [availableProducts, setAvailableProducts] = useState([]);
  const [billedItems, setBilledItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // search and dropdown state
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const serviceFee = parseFloat(activeTask?.service_fee || 0);
  const isLocked = ['billed', 'completed'].includes(activeTask?.status);

  // close dropdown when click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatExpiry = (dateString) => {
    if (!dateString) return "No Expiry";
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long', day: '2-digit', year: 'numeric'
    });
  };

  const isExpired = (dateString) => {
    if (!dateString) return false;
    const expiry = new Date(dateString);
    expiry.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiry < today;
  };

  useEffect(() => {
    if(!branchId) return;
    const fetchProducts = async () => {
      try {
        const res = await authFetch(`${API_URL}/api/clinic/general/inventory/get-inventory.php?branchId=${branchId}`);
        if(res?.success) setAvailableProducts(res.data || []);
      } catch(err) { 
        toast.error("Failed to load inventory."); 
      }
    };
    fetchProducts();
  }, [branchId]);

  useEffect(() => {
    if(isLocked && activeTask?.id) {
      const fetchBilledDetails = async () => {
        try {
          const res = await authFetch(`${API_URL}/api/clinic/general/appointment/get-billing-details.php?appointment_id=${activeTask.id}`);
          if(res?.success) {
            const productsOnly = res.data
              .filter(item => item.inventory_id !== null)
              .map(item => ({
                inventory_id: item.inventory_id,
                product_id: item.product_id,
                name: item.name,
                price: parseFloat(item.price), 
                qty: parseInt(item.qty),
                supplier_name: item.supplier_name,
                expiry_date: item.expiry_date,
                type: 'product'
              }));
            setBilledItems(productsOnly);
            if(res.payment_method) setPaymentMethod(res.payment_method.toLowerCase());
            if(res.payment_status) setPaymentStatus(res.payment_status.toLowerCase());
          }
        } catch(err) {
          toast.error("Could not retrieve billing history.");
        }
      };
      fetchBilledDetails();
    }
  }, [activeTask?.id, isLocked]);

  const handleQtyChange = (inventoryId, value) => {
    if(isLocked) return; 
    if(value === "") {
      setBilledItems(prev => prev.map(item => 
        String(item.inventory_id) === String(inventoryId) ? { ...item, qty: "" } : item
      ));
      return;
    }
    let newQty = Math.abs(parseInt(value));
    
    if(newQty < 1) {
      return; 
    }
    
    if (isNaN(newQty)) newQty = 1;
    const prodRef = availableProducts.find(p => String(p.inventory_id) === String(inventoryId));
    const maxStock = parseInt(prodRef?.stock_level || 0);
    if(newQty > maxStock) {
      toast.warn(`Only ${maxStock} in stock.`);
      newQty = maxStock;
    }
    setBilledItems(prev => prev.map(item => 
      String(item.inventory_id) === String(inventoryId) ? { ...item, qty: newQty } : item
    ));
  };

  const handleQtyBlur = (inventoryId, value) => {
    let finalQty = Math.abs(parseInt(value));
    if(isNaN(finalQty) || finalQty < 1) finalQty = 1;
    setBilledItems(prev => prev.map(item => 
      String(item.inventory_id) === String(inventoryId) ? { ...item, qty: finalQty } : item
    ));
  };

  const handleAddItem = (prod) => {
    if (parseInt(prod.stock_level) <= 0) return toast.error("No stocks available!");
    if (isExpired(prod.expiry_date)) return toast.error("This item is expired!");

    const existing = billedItems.find(i => String(i.inventory_id) === String(prod.inventory_id));
    if (existing) {
      handleQtyChange(prod.inventory_id, (parseInt(existing.qty) || 0) + 1);
    } else {
      setBilledItems([...billedItems, { ...prod, qty: 1 }]);
    }
    setIsDropdownOpen(false);
    setSearchTerm("");
  };

  const getPricingBreakdown = () => {
    const itemsSubtotal = billedItems.reduce((sum, i) => sum + (parseFloat(i.price) * (parseInt(i.qty) || 0)), 0);
    return { service: serviceFee, items: itemsSubtotal, total: serviceFee + itemsSubtotal };
  };

  const pricing = getPricingBreakdown();

  const handleCancel = async () => {
    const { value: reason, isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: 'Cancel Appointment?',
      text: "Please provide a reason for cancellation:",
      input: 'textarea',
      inputPlaceholder: 'Type the reason here...',
      inputAttributes: {
        'aria-label': 'Type your reason here'
      },
      showCancelButton: true,
      confirmButtonText: 'Confirm Cancellation',
      cancelButtonText: 'Keep Appointment',
      buttonsStyling: false,
      reverseButtons: true,
      customClass: {
        popup: '!rounded-xl border !border-gray-300 !max-w-lg',
        title: '!text-xl !font-black !uppercase !tracking-tight !text-red-600',
        htmlContainer: '!text-sm !font-medium !text-gray-500',
        input: '!rounded-xl !border-gray-300 !text-sm !focus:ring-(--clr-primary) !focus:border-(--clr-primary) !outline:none !m-4',
     
        confirmButton: 'rounded-lg px-5 py-2.5 cursor-pointer duration-300 ease-in-out active:scale-95 text-white text-sm font-bold bg-red-500 hover:bg-red-600' ,
        cancelButton: 'rounded-lg px-5 py-2.5 active:scale-95 duration-300 ease-in-out cursor-pointer text-sm font-bold'
      },
      // dont allow empty
      preConfirm: (value) => {
        if(!value) {
          Swal.showValidationMessage('Cancellation reason is required');
        }
        return value;
      }
    });

    if (isConfirmed && reason) {
      const appointmentId = activeTask?.id || activeTask?.appointment_id;
      const actorName = user?.name || 'Staff';
      const finalFeedback = `Cancelled by ${actorName}. Reason: ${reason}`;

      showLoader('Processing Cancellation...');
      try {
        const res = await authFetch(`${API_URL}/api/clinic/general/appointment/update-appointment-status.php`, {
          method: 'POST',
          body: JSON.stringify({ 
            appointment_id: appointmentId, 
            status: 'cancelled', 
            feedback: finalFeedback 
          })
        });

        if(res?.success) {
          toast.info("Appointment has been cancelled.");
          if (onRefresh) onRefresh();
          onClose(); 
        }
      } catch(err) {
        toast.error("Something went wrong.");
      } finally {
        hideLoader();
      }
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    showLoader('Processing...');
    try {
      const payload = {
        appointment_id: activeTask.id,
        branch_id: branchId,
        total: parseFloat(pricing.total.toFixed(2)),
        payment_method: paymentMethod,
        items: [
          { service_id: activeTask.branch_service_id, name: activeTask?.service_name || 'Service', price: serviceFee, qty: 1, type: 'service' },
          ...billedItems.map(i => ({ inventory_id: i.inventory_id, product_id: i.product_id, name: i.name, price: i.price, qty: i.qty, type: 'product' }))
        ]
      };
      const res = await authFetch(`${API_URL}/api/clinic/general/appointment/pay-appointment.php`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if(res?.success) {
        toast.success("Payment successful");
        if (onRefresh) onRefresh();
        onClose(); 
      }
    } catch(err) {
      toast.error("Transaction failed");
    } finally {
      hideLoader();
      setIsSubmitting(false);
    }
  };

  // search filter
  const filteredProducts = availableProducts.filter(p => {
    const isActive = parseInt(p.is_active) === 1;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return isActive && matchesSearch;
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-300 bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-xl overflow-hidden bg-white rounded-2xl">
        
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

        {/* content */}
        <div className="p-8 h-[550px] flex flex-col">
          <div className="flex-1 pr-2 overflow-y-auto custom-scrollbar">
            {activeTab === 'overview' ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-6">
                  <div className="flex-none w-20 h-20 overflow-hidden bg-gray-100 border-4 border-white rounded-3xl">
                    <img src={activeTask?.pet_image ? `${API_URL}/uploads/pets/${activeTask.pet_image}` : noImage} className="object-cover w-full h-full" alt="pet" />
                  </div>
                  <div>
                    <span className="block mb-1 text-[10px] font-black text-gray-400 uppercase">Patient Name</span>
                    <h3 className="text-3xl font-black leading-none tracking-tighter uppercase">{activeTask?.pet_name}</h3>
                    <p className="mt-2 text-[10px] font-black tracking-widest text-gray-400 uppercase">Owner: <span className="text-(--clr-primary)">{activeTask?.owner_name}</span></p>
                  </div>
                </div>

                <div className="space-y-4 border border-green-100 p-7 bg-green-50 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-black text-(--clr-primary) uppercase tracking-widest">Selected Service</span>
                      <h4 className="mt-1 text-xl font-black text-(--clr-primary) uppercase">{activeTask?.service_name || 'Medical Checkup'}</h4>
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
              <div className="space-y-6">
                {isLocked && (
                  <div className="flex items-center justify-between p-4 bg-gray-100 border border-gray-200 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <IoLockClosedOutline className="text-gray-400" size={20} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Transaction Locked</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${paymentStatus === 'paid' ? 'bg-(--clr-primary) text-white' : 'bg-amber-500 text-white'}`}>
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

                {/* payment */}
                <div className="grid grid-cols-2 gap-3">
                  {['cash', 'card'].map(m => (
                    <button key={m} type="button" onClick={() => !isLocked && setPaymentMethod(m)} 
                      className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2
                      ${paymentMethod === m ? 'border-(--clr-primary) bg-(--clr-primary) text-white' : 'border-gray-100 text-gray-400 bg-white hover:border-gray-300'}
                      ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      {m === 'cash' ? <HiCash size={18}/> : <HiCreditCard size={18}/>} {m}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  {/* search */}
                  {!isLocked && (
                    <div className="relative" ref={dropdownRef}>
                      <div 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full p-4 text-[10px] font-black uppercase tracking-widest bg-gray-100 border-2 border-transparent rounded-2xl cursor-pointer flex justify-between items-center focus:border-(--clr-primary)"
                      >
                        <span className="text-gray-500">+ Add Items from Inventory</span>
                        <HiChevronDown className={`text-xl transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>

                      {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl z-[50] shadow-xl overflow-hidden flex flex-col max-h-[300px]">
                          {/* search input */}
                          <div className="flex items-center gap-2 p-3 border-b bg-gray-50">
                            <HiSearch className="text-gray-400" />
                            <input 
                              autoFocus
                              type="text" 
                              placeholder="Search products or distributor..." 
                              className="w-full bg-transparent border-none outline-none text-[10px] font-black tracking-widest"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>

                          {/* list */}
                          <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                            {filteredProducts.length > 0 ? (
                              filteredProducts.map(p => {
                                const expired = isExpired(p.expiry_date);
                                const noStock = parseInt(p.stock_level) <= 0;
                                const isDisabled = expired || noStock;

                                return (
                                  <div 
                                    key={p.inventory_id} 
                                    onClick={() => !isDisabled && handleAddItem(p)}
                                    className={`p-4 border-b last:border-none flex flex-col gap-1 transition-colors ${isDisabled ? 'bg-gray-50 opacity-60 cursor-not-allowed' : 'hover:bg-green-50 cursor-pointer'}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className={`text-[10px] font-black uppercase ${expired ? 'text-red-500' : 'text-gray-700'}`}>
                                        {p.name} {expired && "(EXPIRED)"} {noStock && "(OUT OF STOCK)"}
                                      </span>
                                      <span className="text-[10px] font-black text-(--clr-primary)">₱{parseFloat(p.price).toLocaleString()}</span>
                                    </div>
                                    <div className="flex gap-3 text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                                      <span>Dist: {p.supplier_name || 'N/A'}</span>
                                      <span>Exp: {formatExpiry(p.expiry_date)}</span>
                                      <span>Stocks: {p.stock_level}</span>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-6 text-center text-[10px] font-black text-gray-400 uppercase">No active items found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* billed items */}
                  <div className="space-y-3">
                    {billedItems.map(item => {
                      const originalProd = availableProducts.find(p => String(p.inventory_id) === String(item.inventory_id));

                      return (
                        <div key={item.inventory_id} className="flex items-center justify-between p-4 bg-white border border-gray-300 rounded-2xl">
                          <div className="flex-1">
                            <p className="text-[11px] font-black text-gray-800 uppercase flex gap-2 items-center">
                              {item.name} 
                              <span className="text-(--clr-primary)">₱{parseFloat(item.price).toLocaleString()}</span>
                            </p>
                            <div className="flex flex-wrap gap-3 mt-1">
                              <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">
                                Exp: {formatExpiry(item.expiry_date)}
                              </span>
                              <span className="text-[9px] font-black text-gray-700 uppercase tracking-tighter">
                                Stock: {originalProd?.stock_level || item.stock_level}
                              </span>
                              <span className="text-[9px] font-black text-gray-700 uppercase tracking-tighter">
                                Dist: {item.supplier_name}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                          {isLocked ? (
                              <div className="px-4 py-2 border border-gray-200 bg-gray-50 rounded-xl">
                                <span className="text-[10px] font-black text-gray-500 uppercase">Qty: {item.qty}</span>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center px-2 bg-gray-100 border border-transparent rounded-xl focus-within:border-(--clr-primary) focus-within:bg-white">
                                  <button onClick={() => handleQtyChange(item.inventory_id, (parseInt(item.qty) || 0) - 1)} className="p-2 cursor-pointer hover:text-(--clr-primary)"><HiMinus size={14}/></button>
                                  <input type="number" value={item.qty} onChange={(e) => handleQtyChange(item.inventory_id, e.target.value)} onBlur={(e) => handleQtyBlur(item.inventory_id, e.target.value)} className="w-10 text-xs font-black text-center bg-transparent border-none outline-none" />
                                  <button onClick={() => handleQtyChange(item.inventory_id, (parseInt(item.qty) || 0) + 1)} className="p-2 cursor-pointer hover:text-(--clr-primary)"><HiPlus size={14}/></button>
                                </div>
                                <button onClick={() => setBilledItems(billedItems.filter(i => i.inventory_id !== item.inventory_id))} className="text-gray-300 cursor-pointer hover:text-red-500"><HiTrash size={18}/></button>
                              </>
                            )}
                          </div>
                        </div>
                      )
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