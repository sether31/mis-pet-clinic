import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../../../hooks/useUI';
// utils
import { authFetch } from '../../../../utils/authFetch';
// icons
import { 
  HiXCircle, HiTrash, HiPlus, HiMinus, 
  HiSearch, HiChevronDown
} from 'react-icons/hi';

const API_URL = import.meta.env.VITE_API_URL;

export default function CreateReservationModal({ branchId, onClose, onRefresh }) {
  const { showLoader, hideLoader } = useUI();
  const [availableProducts, setAvailableProducts] = useState([]);
  const [billedItems, setBilledItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // search and dropdown state
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const formatExpiry = (dateString, category) => {
    if (category === 'Accessories' || !dateString) return "No Expiry";
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: '2-digit', year: 'numeric'
    });
  };

  useEffect(() => {
    if(!branchId) return;
    const fetchProducts = async () => {
      try {
        const res = await authFetch(`${API_URL}/api/clinic/general/inventory/get-inventory.php?branchId=${branchId}`);
        if(res?.success) {
            // STRICT FILTER: Active, In-Stock, and Not Expired
            const today = new Date().setHours(0,0,0,0);
            const filtered = (res.data || []).filter(i => {
                const hasStock = parseInt(i.stock_level) > 0;
                const isActive = parseInt(i.is_active) === 1;
                const notExpired = !i.expiry_date || new Date(i.expiry_date).setHours(0,0,0,0) >= today;
                return hasStock && isActive && notExpired;
            });
            setAvailableProducts(filtered);
        }
      } catch(err) { 
        toast.error("Failed to load inventory."); 
      }
    };
    fetchProducts();
  }, [branchId]);

  const handleQtyChange = (inventoryId, value) => {
    if(value === "") {
      setBilledItems(prev => prev.map(item => 
        String(item.inventory_id) === String(inventoryId) ? { ...item, qty: "" } : item
      ));
      return;
    }
    let newQty = Math.abs(parseInt(value));
    if(newQty < 1) return; 
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
    const existing = billedItems.find(i => String(i.inventory_id) === String(prod.inventory_id));
    if (existing) {
      handleQtyChange(prod.inventory_id, (parseInt(existing.qty) || 0) + 1);
    } else {
      setBilledItems([...billedItems, { ...prod, qty: 1 }]);
    }
    setIsDropdownOpen(false);
    setSearchTerm("");
  };

  const totalAmount = useMemo(() => {
    return billedItems.reduce((sum, i) => sum + (parseFloat(i.price) * (parseInt(i.qty) || 0)), 0);
  }, [billedItems]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (billedItems.length === 0) return toast.error("Add items to bill.");

    setIsSubmitting(true);
    showLoader('Processing...');
    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/shop/create-reservation.php`, {
        method: 'POST',
        body: JSON.stringify({
          branch_id: branchId,
          is_anonymous: true,
          items: billedItems,
          total_amount: totalAmount
        })
      });

      if (res?.success) {
        toast.success("Transaction successful!");
        if (onRefresh) onRefresh();
        onClose(); 
      } else {
          toast.error(res.message || "Failed to complete transaction.");
      }
    } catch(err) {
      toast.error("Error creating sale.");
    } finally {
      hideLoader();
      setIsSubmitting(false);
    }
  };

  // search filter
  const filteredProducts = useMemo(() => {
    const grouped = availableProducts.reduce((acc, item) => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTermLower) || 
        item.brand_name?.toLowerCase().includes(searchTermLower) ||
        item.dosage?.toLowerCase().includes(searchTermLower) ||
        item.category?.toLowerCase().includes(searchTermLower);
      
      if (!matchesSearch) return acc;

      const prodId = item.product_id;

      // FIFO Logic: Pick the batch that expires first
      if (!acc[prodId]) {
        acc[prodId] = item;
      } else {
        const currentExpiry = new Date(acc[prodId].expiry_date || '9999-12-31');
        const nextExpiry = new Date(item.expiry_date || '9999-12-31');
        
        if (nextExpiry < currentExpiry) {
          acc[prodId] = item;
        }
      }
      return acc;
    }, {});

    return Object.values(grouped);
  }, [availableProducts, searchTerm]);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-10000 bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-xl overflow-hidden bg-white rounded-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">Guest Product Purchase</h2>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
              Walk-in sale
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-all cursor-pointer hover:text-red-500">
            <HiXCircle size={32}/>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-8 h-[550px] flex flex-col">
          <div className="flex-1 pr-2 overflow-y-auto custom-scrollbar space-y-6">
            
            {/* Search Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full p-4 text-[10px] font-black uppercase tracking-widest bg-gray-100 border-2 border-transparent rounded-2xl cursor-pointer flex justify-between items-center focus:border-(--clr-primary)"
              >
                <span className="text-gray-500">+ Add Products from Inventory</span>
                <HiChevronDown className={`text-xl transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl z-[50] shadow-xl overflow-hidden flex flex-col max-h-[300px]">
                  <div className="flex items-center gap-2 p-3 border-b bg-gray-50">
                    <HiSearch className="text-gray-400" />
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Search name, brand, dosage, or category..." 
                      className="w-full bg-transparent border-none outline-none text-[10px] font-black tracking-widest"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(p => (
                        <div 
                          key={p.inventory_id} 
                          onClick={() => handleAddItem(p)}
                          className="p-4 border-b last:border-none flex flex-col gap-1 hover:bg-blue-50/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase text-gray-700">{p.name}</span>
                                
                                {/* Dosage Badge (Meds only) */}
                                {(p.category === 'Medication' || p.category === 'Supplies') && p.dosage && (
                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 uppercase">
                                        {p.dosage}
                                    </span>
                                )}

                                {/* Category Tag */}
                                <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 uppercase border border-gray-200">
                                    {p.category}
                                </span>
                            </div>
                            <span className="text-[10px] font-black text-(--clr-primary)">
                              ₱{parseFloat(p.price).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[8px] font-bold uppercase tracking-tighter">
                            <span className="text-gray-500 italic">
                                {p.brand_name || 'No Brand'} 
                                {(p.category === 'Medication' || p.category === 'Supplies') && p.brand_type !== 'N/A' && ` • ${p.brand_type}`}
                            </span>
                            <span className="text-blue-500 font-black">Exp: {formatExpiry(p.expiry_date, p.category)}</span>
                            <span className="text-gray-400">Stock: {p.stock_level}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-[10px] font-black text-gray-400 uppercase">No active items found</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Billed Items List */}
            <div className="space-y-3">
              {billedItems.map(item => {
                const originalProd = availableProducts.find(p => String(p.inventory_id) === String(item.inventory_id));

                return (
                  <div key={item.inventory_id} className="flex items-center justify-between p-4 bg-white border border-gray-300 rounded-2xl shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-black text-gray-800 uppercase">{item.name}</p>
                        {item.dosage && (item.category === 'Medication' || item.category === 'Supplies') && (
                            <span className="text-[9px] font-black text-blue-500 uppercase">({item.dosage})</span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-3 mt-1 text-[9px] font-bold uppercase tracking-tighter">
                        <span className="text-(--clr-primary) font-black">₱{parseFloat(item.price).toLocaleString()}</span>
                        
                        {/* Billed Category Badge */}
                        <span className="px-1.5 bg-gray-50 text-gray-400 rounded border border-gray-100 uppercase text-[8px]">{item.category}</span>
                        
                        <span className="text-gray-400 italic">
                            {item.brand_name}
                            {(item.category === 'Medication' || item.category === 'Supplies') && item.brand_type !== 'N/A' && ` • ${item.brand_type}`}
                        </span>
                        <span className="text-gray-400">Stock: {originalProd?.stock_level || item.stock_level}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center px-2 bg-gray-100 border border-transparent rounded-xl focus-within:border-(--clr-primary) focus-within:bg-white transition-all">
                        <button onClick={() => handleQtyChange(item.inventory_id, (parseInt(item.qty) || 0) - 1)} className="p-2 cursor-pointer hover:text-(--clr-primary)"><HiMinus size={14}/></button>
                        <input 
                          type="number" 
                          value={item.qty} 
                          onChange={(e) => handleQtyChange(item.inventory_id, e.target.value)} 
                          onBlur={(e) => handleQtyBlur(item.inventory_id, e.target.value)} 
                          className="w-10 text-xs font-black text-center bg-transparent border-none outline-none" 
                        />
                        <button onClick={() => handleQtyChange(item.inventory_id, (parseInt(item.qty) || 0) + 1)} className="p-2 cursor-pointer hover:text-(--clr-primary)"><HiPlus size={14}/></button>
                      </div>
                      <button onClick={() => setBilledItems(billedItems.filter(i => i.inventory_id !== item.inventory_id))} className="text-gray-300 cursor-pointer hover:text-red-500">
                        <HiTrash size={18}/>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

          </div>

          {/* Footer Box */}
          <div className="pt-6 mt-auto border-t border-gray-100">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between text-white bg-black p-6 rounded-[1.5rem] shadow-lg">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Due</p>
                  <p className="text-3xl font-black tracking-tighter text-(--clr-primary)">
                    ₱{totalAmount.toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || billedItems.length === 0} 
                  className="px-8 py-4 font-black text-[10px] uppercase tracking-widest bg-(--clr-primary) text-white rounded-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : 'Process Cash Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}